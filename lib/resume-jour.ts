import { minutesLibres, type AnalyseJournee } from "@/lib/agenda";
import type { Tache } from "@/lib/taches";
import { formatDuree } from "@/lib/time";

// "Aujourd'hui en une ligne", générée à partir des données (sans IA).
export function ligneDuJour(analyse: AnalyseJournee | null, principale: Tache | null): string {
  const morceaux: string[] = [];
  if (analyse) {
    const n = analyse.evenements.length;
    morceaux.push(n === 0 ? "Aucune réunion aujourd'hui" : `${n} réunion${n > 1 ? "s" : ""} aujourd'hui`);
    const libre = minutesLibres(analyse.libres);
    morceaux.push(libre > 0 ? `${formatDuree(libre)} de temps libre` : "pas de créneau libre");
  }
  const phrase = morceaux.length > 0 ? `${morceaux.join(", ")}.` : "";
  const priorite = principale ? ` À faire en priorité : ${principale.titre}.` : " Aucune tâche urgente.";
  return `${phrase}${priorite}`.trim();
}
