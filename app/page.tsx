import { Suspense } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BoutonResume } from "@/components/bouton-resume";
import { AgendaSection } from "@/components/sections/agenda";
import { AlertesSection } from "@/components/sections/alertes";
import { ConnexionsSection, type EtatGoogle } from "@/components/sections/connexions";
import { EmailsChargement, EmailsSection } from "@/components/sections/emails";
import { Section } from "@/components/sections/section";
import { TachesSection, type GroupesVue, type TacheVue } from "@/components/sections/taches";
import { Button } from "@/components/ui/button";
import { analyserJournee, evenementsDuJour, type AnalyseJournee } from "@/lib/agenda";
import { calculerAlertes } from "@/lib/alertes";
import { ClaudeRefusalError } from "@/lib/anthropic";
import { config } from "@/lib/config";
import { chargerEmails, type ResultatEmails } from "@/lib/emails";
import { chargerEvenements } from "@/lib/evenements";
import type { CalEvent } from "@/lib/google/calendar";
import { GoogleReconnectError } from "@/lib/google/oauth";
import { getAccessToken, getGoogleIntegration } from "@/lib/google/tokens";
import { ligneDuJour } from "@/lib/resume-jour";
import { createClient } from "@/lib/supabase/server";
import { aUneHeure, chargerTaches, grouperTaches, tachePrincipale, type Tache } from "@/lib/taches";
import { addDays, formatJourCourt, isValidYmd, localDate, localTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type EmailsCharges = { resultat: ResultatEmails | null; erreur: string | null };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string; google?: string }>;
}) {
  const params = await searchParams;
  const tz = config.timezone;
  const fenetre = { debut: config.journeeDebut, fin: config.journeeFin };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // le middleware redirige déjà vers /login

  const aujourdhui = localDate(new Date(), tz);
  const jour =
    isValidYmd(params.jour) && params.jour >= aujourdhui && params.jour <= addDays(aujourdhui, 6)
      ? params.jour
      : aujourdhui;

  // --- Google Agenda : un seul appel pour 14 jours ---
  const integration = await getGoogleIntegration(supabase, user.id);
  let etatGoogle: EtatGoogle = integration ? "connecte" : "non_connecte";
  let erreurAgenda: string | null = integration ? null : "Connecte Google pour voir ton agenda.";
  let derniereSync = integration?.derniere_synchronisation ?? null;
  let events: CalEvent[] | null = null;

  if (integration) {
    try {
      events = await chargerEvenements(supabase, user.id, tz);
      derniereSync = new Date().toISOString();
    } catch (e) {
      if (e instanceof GoogleReconnectError) {
        etatGoogle = "expire";
        erreurAgenda = e.message;
      } else {
        console.error("Agenda :", e);
        etatGoogle = "erreur";
        erreurAgenda = "Impossible de charger l'agenda pour le moment.";
      }
    }
  }

  const analyse = (ymd: string): AnalyseJournee | null =>
    events ? analyserJournee(evenementsDuJour(events, ymd, tz), ymd, tz, fenetre) : null;
  const analyseAujourdhui = analyse(aujourdhui);
  const analyseJour = jour === aujourdhui ? analyseAujourdhui : analyse(jour);

  // --- Tâches ---
  const taches = await chargerTaches(supabase, user.id, tz);
  const groupes = grouperTaches(taches, tz);

  // --- Emails : chargés en parallèle, partagés entre la section Emails et les alertes ---
  const emails: Promise<EmailsCharges> =
    etatGoogle === "connecte"
      ? chargerEmailsSansErreur(supabase, user.id, tz)
      : Promise.resolve({ resultat: null, erreur: "Connecte Google pour voir tes emails." });

  const vue = (t: Tache): TacheVue => vueTache(t, tz, aujourdhui);
  const groupesVue: GroupesVue = [
    { titre: "En retard", taches: groupes.enRetard.map(vue), vide: "Rien en retard." },
    { titre: "Aujourd'hui", taches: groupes.aujourdhui.map(vue), vide: "Rien de prévu aujourd'hui." },
    { titre: "3 prochains jours", taches: groupes.prochainsJours.map(vue), vide: "Rien dans les 3 prochains jours." },
    { titre: "Plus tard / sans date", taches: groupes.plusTard.map(vue), vide: "Aucune autre tâche." },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de Vie</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button variant="outline" size="sm" type="submit">
            Déconnexion
          </Button>
        </form>
      </header>

      <Section id="une-ligne" titre="Aujourd'hui en une ligne">
        <div className="flex flex-col gap-4">
          <p className="text-base">{ligneDuJour(analyseAujourdhui, tachePrincipale(groupes))}</p>
          <BoutonResume />
        </div>
      </Section>

      <AgendaSection jour={jour} aujourdhui={aujourdhui} tz={tz} analyse={analyseJour} erreur={erreurAgenda} />

      <Suspense fallback={<EmailsChargement />}>
        <Emails promesse={emails} tz={tz} />
      </Suspense>

      <TachesSection groupes={groupesVue} />

      {events && analyseAujourdhui ? (
        <Suspense fallback={<AlertesSection alertes={null} note="Calcul en cours…" />}>
          <Alertes
            promesse={emails}
            calcul={(e) =>
              calculerAlertes({ events, aujourdhui, analyseAujourdhui, groupes, emails: e, tz })
            }
          />
        </Suspense>
      ) : (
        <AlertesSection alertes={null} erreur="Connecte Google pour activer les alertes." />
      )}

      <ConnexionsSection etat={etatGoogle} derniereSync={derniereSync} tz={tz} retour={params.google} />
    </main>
  );
}

function vueTache(t: Tache, tz: string, aujourdhui: string): TacheVue {
  let date = "";
  let heure = "";
  let echeance = "";
  if (t.date_limite) {
    const d = new Date(t.date_limite);
    date = localDate(d, tz);
    heure = aUneHeure(t.date_limite, tz) ? localTime(d, tz) : "";
    const libelleJour =
      date === aujourdhui ? "Aujourd'hui" : date === addDays(aujourdhui, 1) ? "Demain" : formatJourCourt(date, tz);
    echeance = heure ? `${libelleJour} ${heure}` : libelleJour;
  }
  return {
    id: t.id,
    titre: t.titre,
    description: t.description ?? "",
    priorite: t.priorite,
    statut: t.statut,
    projet: t.projet ?? "",
    date,
    heure,
    echeance,
  };
}

async function chargerEmailsSansErreur(supabase: SupabaseClient, userId: string, tz: string): Promise<EmailsCharges> {
  try {
    const token = await getAccessToken(supabase, userId);
    const resultat = await chargerEmails({ supabase, userId, token, prioritaires: config.prioritySenders, tz });
    return { resultat, erreur: null };
  } catch (e) {
    console.error("Emails :", e);
    if (e instanceof GoogleReconnectError) return { resultat: null, erreur: e.message };
    if (e instanceof ClaudeRefusalError) return { resultat: null, erreur: "Claude a refusé de trier ces emails." };
    return { resultat: null, erreur: "Impossible de trier les emails pour le moment." };
  }
}

// Composants asynchrones : l'agenda et les tâches s'affichent pendant le tri des emails.
async function Emails({ promesse, tz }: { promesse: Promise<EmailsCharges>; tz: string }) {
  const { resultat, erreur } = await promesse;
  return <EmailsSection resultat={resultat} erreur={erreur} tz={tz} />;
}

async function Alertes({
  promesse,
  calcul,
}: {
  promesse: Promise<EmailsCharges>;
  calcul: (emails: ResultatEmails["repondre"] | null) => ReturnType<typeof calculerAlertes>;
}) {
  const { resultat } = await promesse;
  const emails = resultat ? [...resultat.repondre, ...resultat.attente, ...resultat.informatifs] : null;
  return <AlertesSection alertes={calcul(emails)} />;
}
