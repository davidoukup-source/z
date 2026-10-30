import { addDays, localDate, zonedToUtc } from "@/lib/time";

// Interprète une tâche écrite en une ligne, en français, sans IA.
// Ex. "payer l'électricité vendredi" → titre + date limite au vendredi.

export type Priorite = "haute" | "moyenne" | "basse";

export type TacheAnalysee = {
  titre: string;
  dateLimite: Date | null;
  priorite: Priorite;
  projet: string | null;
};

// Heure utilisée quand seule la date est donnée : la fin de la journée.
export const HEURE_PAR_DEFAUT = "23:59";

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = [
  "janvier",
  "février|fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août|aout",
  "septembre",
  "octobre",
  "novembre",
  "décembre|decembre",
];

function jourSemaine(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function ymd(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

export function analyserTache(texte: string, maintenant: Date, tz: string): TacheAnalysee {
  let reste = ` ${texte.trim()} `;
  const aujourdhui = localDate(maintenant, tz);
  const [annee, moisCourant, jourCourant] = aujourdhui.split("-").map(Number);
  let jour: string | null = null;
  let heure: string | null = null;
  let priorite: Priorite = "moyenne";
  let projet: string | null = null;

  const retirer = (re: RegExp, action: (m: RegExpMatchArray) => boolean | void) => {
    const m = reste.match(re);
    if (m && action(m) !== false) reste = reste.replace(m[0], " ");
  };

  retirer(/\s#([\p{L}\d_-]+)/u, (m) => {
    projet = m[1];
  });
  retirer(/\s(!{1,3}|urgent|important)(?=\s)/i, () => {
    priorite = "haute";
  });
  retirer(/\s(?:priorité\s+)?(basse|pas urgent)(?=\s)/i, () => {
    priorite = "basse";
  });

  retirer(/\s(?:à|a|vers)?\s*(\d{1,2})\s*h\s*(\d{2})?(?=\s)/i, (m) => {
    const h = Number(m[1]);
    const mi = Number(m[2] ?? 0);
    if (h > 23 || mi > 59) return false;
    heure = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  });

  const relatifs: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/\s(?:après|apres)[- ]demain(?=\s)/i, () => addDays(aujourdhui, 2)],
    [/\sdemain(?:\s(?:matin|soir|midi))?(?=\s)/i, () => addDays(aujourdhui, 1)],
    [/\s(?:aujourd['’]hui|ce soir|ce matin|cet après-midi|cet apres-midi|ce midi)(?=\s)/i, () => aujourdhui],
    [/\sdans\s(\d{1,3})\sjours?(?=\s)/i, (m) => addDays(aujourdhui, Number(m[1]))],
    [/\s(?:dans une semaine|la semaine prochaine)(?=\s)/i, () => addDays(aujourdhui, 7)],
    [
      new RegExp(`\\s(?:ce\\s|le\\s)?(${JOURS.join("|")})(\\sprochain)?(?=\\s)`, "i"),
      (m) => {
        const cible = JOURS.indexOf(m[1].toLowerCase());
        let ecart = (cible - jourSemaine(aujourdhui) + 7) % 7;
        if (ecart === 0) ecart = 7;
        return addDays(aujourdhui, ecart);
      },
    ],
    [
      new RegExp(`\\s(?:le\\s)?(\\d{1,2})(?:er)?\\s(${MOIS.join("|")})(?:\\s(\\d{4}))?(?=\\s)`, "i"),
      (m) => {
        const mois = MOIS.findIndex((nom) => nom.split("|").includes(m[2].toLowerCase())) + 1;
        let y = m[3] ? Number(m[3]) : annee;
        let d = ymd(y, mois, Number(m[1]));
        if (d && !m[3] && d < aujourdhui) d = ymd(++y, mois, Number(m[1]));
        return d;
      },
    ],
    [
      /\s(?:le\s)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/,
      (m) => {
        let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : annee;
        let d = ymd(y, Number(m[2]), Number(m[1]));
        if (d && !m[3] && d < aujourdhui) d = ymd(++y, Number(m[2]), Number(m[1]));
        return d;
      },
    ],
    [
      /\sle\s(\d{1,2})(?:er)?(?=\s)/i,
      (m) => {
        const n = Number(m[1]);
        let d = ymd(annee, moisCourant, n);
        if (d && n < jourCourant) d = moisCourant === 12 ? ymd(annee + 1, 1, n) : ymd(annee, moisCourant + 1, n);
        return d;
      },
    ],
  ];

  for (const [re, calcul] of relatifs) {
    const m = reste.match(re);
    if (!m) continue;
    const d = calcul(m);
    if (d) {
      jour = d;
      reste = reste.replace(m[0], " ");
      break;
    }
  }

  if (!jour && heure) jour = aujourdhui;

  const titre =
    reste
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s(?:pour|avant|d['’]ici|le|ce|à|a)$/i, "")
      .trim() || texte.trim();

  return {
    titre: titre.charAt(0).toUpperCase() + titre.slice(1),
    dateLimite: jour ? zonedToUtc(jour, heure ?? HEURE_PAR_DEFAUT, tz) : null,
    priorite,
    projet,
  };
}
