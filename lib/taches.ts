import type { SupabaseClient } from "@supabase/supabase-js";

import { HEURE_PAR_DEFAUT, type Priorite } from "@/lib/parse-tache";
import { addDays, dayBounds, localDate, localTime } from "@/lib/time";

export type Statut = "en_attente" | "en_cours" | "terminee";

export type Tache = {
  id: string;
  titre: string;
  description: string | null;
  date_limite: string | null;
  priorite: Priorite;
  statut: Statut;
  projet: string | null;
  created_at: string;
};

export type GroupesTaches = {
  enRetard: Tache[];
  aujourdhui: Tache[];
  prochainsJours: Tache[];
  plusTard: Tache[];
};

const RANG: Record<Priorite, number> = { haute: 0, moyenne: 1, basse: 2 };

// Temps estimé par tâche, faute de durée dans le modèle de données.
export const MINUTES_PAR_PRIORITE: Record<Priorite, number> = { haute: 60, moyenne: 30, basse: 15 };

export async function chargerTaches(supabase: SupabaseClient, userId: string, tz: string): Promise<Tache[]> {
  const { debut } = dayBounds(localDate(new Date(), tz), tz);
  const { data, error } = await supabase
    .from("taches")
    .select("id, titre, description, date_limite, priorite, statut, projet, created_at")
    .eq("user_id", userId)
    // Les tâches terminées ne restent visibles que le jour de leur échéance.
    .or(`statut.neq.terminee,date_limite.gte."${debut.toISOString()}"`)
    .order("date_limite", { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) throw new Error(`Lecture des tâches impossible : ${error.message}`);
  return (data ?? []) as Tache[];
}

function trier(a: Tache, b: Tache): number {
  return (
    Number(a.statut === "terminee") - Number(b.statut === "terminee") ||
    RANG[a.priorite] - RANG[b.priorite] ||
    (a.date_limite ?? "").localeCompare(b.date_limite ?? "")
  );
}

export function grouperTaches(taches: Tache[], tz: string, maintenant = new Date()): GroupesTaches {
  const aujourdhui = localDate(maintenant, tz);
  const dans3j = addDays(aujourdhui, 3);
  const groupes: GroupesTaches = { enRetard: [], aujourdhui: [], prochainsJours: [], plusTard: [] };

  for (const t of taches) {
    const jour = t.date_limite ? localDate(new Date(t.date_limite), tz) : null;
    if (!jour) groupes.plusTard.push(t);
    else if (jour < aujourdhui) {
      if (t.statut !== "terminee") groupes.enRetard.push(t);
    } else if (jour === aujourdhui) groupes.aujourdhui.push(t);
    else if (jour <= dans3j) groupes.prochainsJours.push(t);
    else groupes.plusTard.push(t);
  }
  groupes.enRetard.sort(trier);
  groupes.aujourdhui.sort(trier);
  groupes.prochainsJours.sort((a, b) => (a.date_limite ?? "").localeCompare(b.date_limite ?? "") || trier(a, b));
  groupes.plusTard.sort((a, b) => (a.date_limite ?? "9999").localeCompare(b.date_limite ?? "9999") || trier(a, b));
  return groupes;
}

// La tâche la plus importante : en retard ou du jour, par priorité.
export function tachePrincipale(groupes: GroupesTaches): Tache | null {
  const ouvertes = (l: Tache[]) => l.filter((t) => t.statut !== "terminee");
  return (
    [...ouvertes(groupes.enRetard), ...ouvertes(groupes.aujourdhui)].sort(trier)[0] ??
    ouvertes(groupes.prochainsJours).find((t) => t.priorite === "haute") ??
    null
  );
}

export function aUneHeure(dateIso: string, tz: string): boolean {
  return localTime(new Date(dateIso), tz) !== HEURE_PAR_DEFAUT;
}
