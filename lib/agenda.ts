import type { CalEvent } from "@/lib/google/calendar";
import { dayBounds, zonedToUtc } from "@/lib/time";

const MIN = 60_000;
export const ECART_SERRE_MIN = 15;
export const CRENEAU_LIBRE_MIN = 45;

export type Creneau = { debut: Date; fin: Date };

export type AnalyseJournee = {
  evenements: CalEvent[]; // avec horaire, triés
  journeeEntiere: CalEvent[];
  conflits: Set<string>;
  serres: Set<string>;
  libres: Creneau[];
  minutesReunion: number;
};

// Analyse une journée : conflits, enchaînements serrés, créneaux libres.
export function analyserJournee(
  events: CalEvent[],
  ymd: string,
  tz: string,
  fenetre: { debut: string; fin: string },
  maintenant: Date = new Date()
): AnalyseJournee {
  const evenements = events.filter((e) => !e.journeeEntiere).sort((a, b) => +a.debut - +b.debut);
  const journeeEntiere = events.filter((e) => e.journeeEntiere);

  const conflits = new Set<string>();
  for (let i = 0; i < evenements.length; i++) {
    for (let j = i + 1; j < evenements.length; j++) {
      if (evenements[j].debut >= evenements[i].fin) break;
      conflits.add(evenements[i].id);
      conflits.add(evenements[j].id);
    }
  }

  // Enchaînements : l'événement suivant commence moins de 15 min après la fin du précédent.
  const serres = new Set<string>();
  let precedent: CalEvent | null = null;
  for (const e of evenements) {
    if (precedent) {
      const ecart = (+e.debut - +precedent.fin) / MIN;
      if (ecart >= 0 && ecart < ECART_SERRE_MIN) {
        serres.add(precedent.id);
        serres.add(e.id);
      }
    }
    if (!precedent || e.fin > precedent.fin) precedent = e;
  }

  // Créneaux libres de plus de 45 min, dans la fenêtre de la journée (et pas dans le passé).
  const debutFenetre = zonedToUtc(ymd, fenetre.debut, tz);
  const finFenetre = zonedToUtc(ymd, fenetre.fin, tz);
  let curseur = new Date(Math.max(+debutFenetre, +maintenant));
  const libres: Creneau[] = [];
  for (const e of evenements) {
    if (e.debut > curseur) {
      const fin = new Date(Math.min(+e.debut, +finFenetre));
      if ((+fin - +curseur) / MIN >= CRENEAU_LIBRE_MIN) libres.push({ debut: curseur, fin });
    }
    if (e.fin > curseur) curseur = e.fin;
  }
  if ((+finFenetre - +curseur) / MIN >= CRENEAU_LIBRE_MIN) libres.push({ debut: curseur, fin: finFenetre });

  return {
    evenements,
    journeeEntiere,
    conflits,
    serres,
    libres,
    minutesReunion: minutesOccupees(evenements),
  };
}

// Minutes occupées, en fusionnant les événements qui se chevauchent.
export function minutesOccupees(evenements: CalEvent[]): number {
  let total = 0;
  let fin = 0;
  let debut = 0;
  for (const e of [...evenements].sort((a, b) => +a.debut - +b.debut)) {
    if (+e.debut > fin) {
      total += fin - debut;
      debut = +e.debut;
      fin = +e.fin;
    } else if (+e.fin > fin) {
      fin = +e.fin;
    }
  }
  total += fin - debut;
  return Math.round(total / MIN);
}

export function minutesLibres(libres: Creneau[]): number {
  return Math.round(libres.reduce((s, c) => s + (+c.fin - +c.debut), 0) / MIN);
}

export function evenementsDuJour(events: CalEvent[], ymd: string, tz: string): CalEvent[] {
  const { debut, fin } = dayBounds(ymd, tz);
  return events.filter((e) => e.debut < fin && e.fin > debut);
}
