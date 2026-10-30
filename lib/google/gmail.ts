import "server-only";

import { googleGet } from "./tokens";

export type FilEmail = {
  threadId: string;
  sujet: string;
  expediteurNom: string;
  expediteurEmail: string;
  extrait: string;
  dernierMessage: Date;
  nonLu: boolean;
  dernierDeMoi: boolean;
  // Newsletter, notification ou message automatique (détecté sans IA).
  automatique: boolean;
  lien: string;
};

type GmailHeader = { name: string; value: string };
type GmailMessage = {
  id: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
};
type GmailThread = { id: string; messages?: GmailMessage[] };

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

function header(m: GmailMessage, nom: string): string {
  return m.payload?.headers?.find((h) => h.name.toLowerCase() === nom.toLowerCase())?.value ?? "";
}

export function parseFrom(from: string): { nom: string; email: string } {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { nom: match[1].trim() || match[2], email: match[2].trim().toLowerCase() };
  return { nom: from.trim(), email: from.trim().toLowerCase() };
}

function decodeEntites(texte: string): string {
  return texte
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function listerIds(token: string, q: string, max: number): Promise<string[]> {
  const params = new URLSearchParams({ q, maxResults: String(max) });
  const data = await googleGet<{ threads?: { id: string }[] }>(token, `${API}/threads?${params}`);
  return (data.threads ?? []).map((t) => t.id);
}

async function lireFil(token: string, id: string): Promise<FilEmail | null> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Subject", "List-Unsubscribe", "Precedence", "Auto-Submitted"]) {
    params.append("metadataHeaders", h);
  }
  const thread = await googleGet<GmailThread>(token, `${API}/threads/${id}?${params}`);

  const messages = (thread.messages ?? []).filter((m) => !m.labelIds?.includes("DRAFT"));
  if (messages.length === 0) return null;
  const dernier = messages[messages.length - 1];
  // L'expéditeur affiché est le dernier message qui ne vient pas de moi.
  const recu = [...messages].reverse().find((m) => !m.labelIds?.includes("SENT")) ?? dernier;
  const from = parseFrom(header(recu, "From"));
  const labels = recu.labelIds ?? [];
  const automatique =
    !!header(recu, "List-Unsubscribe") ||
    /bulk|list|junk/i.test(header(recu, "Precedence")) ||
    /auto-/i.test(header(recu, "Auto-Submitted")) ||
    /no-?reply|notifications?@|mailer-daemon|newsletter/i.test(from.email) ||
    labels.some((l) => ["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_UPDATES", "CATEGORY_FORUMS"].includes(l));

  return {
    threadId: thread.id,
    sujet: header(messages[0], "Subject") || "(Sans objet)",
    expediteurNom: from.nom,
    expediteurEmail: from.email,
    extrait: decodeEntites(dernier.snippet ?? "").slice(0, 300),
    dernierMessage: new Date(Number(dernier.internalDate ?? 0)),
    nonLu: messages.some((m) => m.labelIds?.includes("UNREAD")),
    dernierDeMoi: !!dernier.labelIds?.includes("SENT"),
    automatique,
    lien: `https://mail.google.com/mail/u/0/#all/${thread.id}`,
  };
}

export function estPrioritaire(email: string, prioritaires: string[]): boolean {
  const e = email.toLowerCase();
  return prioritaires.some((p) => (p.startsWith("@") ? e.endsWith(p) : e === p));
}

// Fils à examiner : non lus ou sans réponse (48 h), expéditeurs prioritaires (7 j),
// et fils où j'attends une réponse depuis plus de 3 jours (14 j max).
export async function listerFilsCandidats(token: string, prioritaires: string[]): Promise<FilEmail[]> {
  const requetes: Promise<string[]>[] = [
    listerIds(token, "in:inbox newer_than:2d", 40),
    listerIds(token, "in:sent older_than:3d newer_than:14d", 20),
  ];
  if (prioritaires.length > 0) {
    requetes.push(listerIds(token, `in:inbox newer_than:7d from:(${prioritaires.join(" OR ")})`, 20));
  }
  const ids = [...new Set((await Promise.all(requetes)).flat())];

  const fils: FilEmail[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const lot = await Promise.all(ids.slice(i, i + 10).map((id) => lireFil(token, id)));
    fils.push(...lot.filter((f): f is FilEmail => f !== null));
  }

  const ilYA2j = Date.now() - 48 * 3600_000;
  const ilYA3j = Date.now() - 72 * 3600_000;
  return fils.filter((f) => {
    if (f.dernierDeMoi) return f.dernierMessage.getTime() < ilYA3j; // j'attends une réponse
    if (estPrioritaire(f.expediteurEmail, prioritaires)) return true;
    return f.dernierMessage.getTime() >= ilYA2j; // non lu ou sans réponse de ma part
  });
}
