import { evenementsDuJour, minutesLibres, minutesOccupees, type AnalyseJournee } from "@/lib/agenda";
import type { EmailClasse } from "@/lib/emails";
import type { CalEvent } from "@/lib/google/calendar";
import { MINUTES_PAR_PRIORITE, type GroupesTaches } from "@/lib/taches";
import { addDays, formatDateHeure, formatDuree, formatJourLong, localDate } from "@/lib/time";

export type Alerte = { type: string; texte: string; lien?: string };

const SEUIL_REUNIONS_MIN = 6 * 60;

export function calculerAlertes(options: {
  events: CalEvent[];
  aujourdhui: string;
  analyseAujourdhui: AnalyseJournee;
  groupes: GroupesTaches;
  emails: EmailClasse[] | null;
  tz: string;
}): Alerte[] {
  const { events, aujourdhui, analyseAujourdhui, groupes, emails, tz } = options;
  const alertes: Alerte[] = [];

  // 1. Emails qui mentionnent une date ou une réunion absente de l'agenda (14 prochains jours).
  const limite = new Date(`${addDays(aujourdhui, 14)}T00:00:00Z`);
  for (const e of emails ?? []) {
    if (!e.dateLimite || e.dateLimite < new Date() || e.dateLimite > limite) continue;
    const jour = localDate(e.dateLimite, tz);
    const duJour = evenementsDuJour(events, jour, tz);
    const date = e.dateLimite;
    const proche = duJour.some(
      (ev) => ev.journeeEntiere || Math.abs(+ev.debut - +date) <= 90 * 60_000 || (ev.debut <= date && ev.fin >= date)
    );
    if (!proche) {
      alertes.push({
        type: "Email sans agenda",
        texte: `« ${e.sujet} » mentionne le ${formatDateHeure(e.dateLimite, tz)}, absent de ton agenda.`,
        lien: e.lien,
      });
    }
  }

  // 2. Réunions du jour sans lien ni description.
  for (const ev of analyseAujourdhui.evenements) {
    if (!ev.lienVisio && !ev.description && !ev.lieu) {
      alertes.push({
        type: "Réunion incomplète",
        texte: `« ${ev.titre} » n'a ni lien, ni lieu, ni description.`,
        lien: ev.lienAgenda ?? undefined,
      });
    }
  }

  // 3. Tâches du jour qui demandent plus de temps que le temps libre restant.
  const ouvertes = [...groupes.enRetard, ...groupes.aujourdhui].filter((t) => t.statut !== "terminee");
  const besoin = ouvertes.reduce((s, t) => s + MINUTES_PAR_PRIORITE[t.priorite], 0);
  const libre = minutesLibres(analyseAujourdhui.libres);
  if (ouvertes.length > 0 && besoin > libre) {
    alertes.push({
      type: "Journée surchargée",
      texte: `${ouvertes.length} tâche(s) à finir aujourd'hui (≈ ${formatDuree(besoin)}) pour ${formatDuree(libre)} de créneaux libres.`,
    });
  }

  // 4. Jours des 7 prochains jours avec plus de 6 h de réunions.
  for (let i = 0; i < 7; i++) {
    const jour = addDays(aujourdhui, i);
    const duJour = evenementsDuJour(events, jour, tz).filter((e) => !e.journeeEntiere);
    const minutes = i === 0 ? analyseAujourdhui.minutesReunion : minutesOccupees(duJour);
    if (minutes > SEUIL_REUNIONS_MIN) {
      alertes.push({
        type: "Trop de réunions",
        texte: `${formatJourLong(jour, tz)} : ${formatDuree(minutes)} de réunions.`,
      });
    }
  }
  return alertes;
}
