// Lecture centralisée des variables d'environnement (côté serveur uniquement).

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export const config = {
  get allowedEmail() {
    return required("ALLOWED_EMAIL").trim().toLowerCase();
  },
  get appUrl() {
    return required("APP_URL").replace(/\/$/, "");
  },
  get timezone() {
    return process.env.TIMEZONE || "Europe/Brussels";
  },
  // Heure du résumé au format HH:MM, heure locale.
  get briefTime() {
    return process.env.BRIEF_TIME || "08:30";
  },
  // Fenêtre dans laquelle on cherche du temps libre (heure locale).
  get journeeDebut() {
    return process.env.JOURNEE_DEBUT || "09:00";
  },
  get journeeFin() {
    return process.env.JOURNEE_FIN || "22:00";
  },
  // Liste séparée par des virgules : emails complets ou domaines (@vub.be).
  get prioritySenders() {
    return (process.env.PRIORITY_SENDERS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  },
};

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === config.allowedEmail;
}
