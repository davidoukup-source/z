import "server-only";

import { config } from "@/lib/config";

// Lecture seule : l'app ne peut ni envoyer, ni modifier, ni supprimer quoi que ce soit.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export const GOOGLE_PROVIDER = "google";

export function redirectUri() {
  return `${config.appUrl}/api/google/callback`;
}

function clientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant");
  return { clientId, clientSecret };
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientCredentials().clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    // Force Google à renvoyer un refresh token à chaque reconnexion.
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: config.allowedEmail,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
};

export class GoogleReconnectError extends Error {
  constructor(message = "La connexion Google a expiré : reconnecte-toi.") {
    super(message);
    this.name = "GoogleReconnectError";
  }
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...body }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    // invalid_grant : token révoqué ou expiré (7 jours en mode Test).
    if (json?.error === "invalid_grant") throw new GoogleReconnectError();
    throw new Error(`Erreur Google OAuth : ${json?.error ?? res.status}`);
  }
  return json as TokenResponse;
}

export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

// L'id_token vient directement de Google en HTTPS : on lit juste l'email qu'il contient.
export function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}
