"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { demanderJson, iaActivee } from "@/lib/anthropic";
import { config, isAllowedEmail } from "@/lib/config";
import { analyserTache, HEURE_PAR_DEFAUT, type TacheAnalysee } from "@/lib/parse-tache";
import { createClient } from "@/lib/supabase/server";
import { localDate, zonedToUtc } from "@/lib/time";

export type EtatAction = { erreur?: string; ok?: string } | undefined;

async function utilisateur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) throw new Error("Non autorisé");
  return { supabase, user };
}

const SchemaTacheIa = z.object({
  titre: z.string(),
  date: z.string().nullable().describe("YYYY-MM-DD ou null"),
  heure: z.string().nullable().describe("HH:MM ou null"),
  priorite: z.enum(["haute", "moyenne", "basse"]),
  projet: z.string().nullable(),
});

async function analyserAvecIa(texte: string): Promise<TacheAnalysee> {
  const tz = config.timezone;
  const r = await demanderJson({
    schema: SchemaTacheIa,
    system:
      "Tu transformes une tâche écrite en une ligne, en français, en champs structurés. " +
      "Le titre ne contient plus la date ni l'heure. Priorité moyenne par défaut, haute si urgent ou '!'. " +
      "Projet : le mot après '#', sinon null.",
    message: `Aujourd'hui : ${localDate(new Date(), tz)} (${new Intl.DateTimeFormat("fr-BE", { weekday: "long", timeZone: tz }).format(new Date())}).\nTâche : ${texte}`,
    maxTokens: 1000,
  });
  const date = r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null;
  const heure = r.heure && /^\d{2}:\d{2}$/.test(r.heure) ? r.heure : HEURE_PAR_DEFAUT;
  return {
    titre: r.titre.trim() || texte,
    dateLimite: date ? zonedToUtc(date, heure, tz) : null,
    priorite: r.priorite,
    projet: r.projet,
  };
}

// Création en une ligne : "payer l'électricité vendredi".
export async function creerTacheRapide(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const texte = String(formData.get("texte") ?? "").trim();
  if (!texte) return { erreur: "Écris une tâche." };
  if (texte.length > 500) return { erreur: "Tâche trop longue (500 caractères max)." };

  const { supabase, user } = await utilisateur();
  let tache = analyserTache(texte, new Date(), config.timezone);
  if (iaActivee()) {
    try {
      tache = await analyserAvecIa(texte);
    } catch (e) {
      console.error("Analyse IA de la tâche, repli sur les règles :", e);
    }
  }

  const { error } = await supabase.from("taches").insert({
    user_id: user.id,
    titre: tache.titre.slice(0, 500),
    date_limite: tache.dateLimite?.toISOString() ?? null,
    priorite: tache.priorite,
    projet: tache.projet,
  });
  if (error) return { erreur: "Impossible d'enregistrer la tâche." };
  revalidatePath("/");
  return { ok: tache.titre };
}

const SchemaMiseAJour = z.object({
  id: z.uuid(),
  titre: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  heure: z.string().regex(/^(\d{2}:\d{2})?$/),
  priorite: z.enum(["haute", "moyenne", "basse"]),
  statut: z.enum(["en_attente", "en_cours", "terminee"]),
  projet: z.string().trim().max(100),
});

export async function modifierTache(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const parse = SchemaMiseAJour.safeParse(Object.fromEntries(formData));
  if (!parse.success) return { erreur: "Champs invalides." };
  const v = parse.data;

  const { supabase } = await utilisateur();
  const { error } = await supabase
    .from("taches")
    .update({
      titre: v.titre,
      description: v.description || null,
      date_limite: v.date ? zonedToUtc(v.date, v.heure || HEURE_PAR_DEFAUT, config.timezone).toISOString() : null,
      priorite: v.priorite,
      statut: v.statut,
      projet: v.projet || null,
    })
    .eq("id", v.id);
  if (error) return { erreur: "Impossible de modifier la tâche." };
  revalidatePath("/");
  return { ok: "Enregistré" };
}

export async function changerStatut(id: string, statut: "en_attente" | "en_cours" | "terminee") {
  if (!z.uuid().safeParse(id).success) return;
  const { supabase } = await utilisateur();
  await supabase.from("taches").update({ statut }).eq("id", id);
  revalidatePath("/");
}

export async function supprimerTache(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const { supabase } = await utilisateur();
  await supabase.from("taches").delete().eq("id", id);
  revalidatePath("/");
}
