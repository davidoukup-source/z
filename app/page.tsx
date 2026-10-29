import { AgendaSection } from "@/components/sections/agenda";
import { ConnexionsSection, type EtatGoogle } from "@/components/sections/connexions";
import { Section, Vide } from "@/components/sections/section";
import { Button } from "@/components/ui/button";
import { analyserJournee, type AnalyseJournee } from "@/lib/agenda";
import { config } from "@/lib/config";
import { listEvents } from "@/lib/google/calendar";
import { GoogleReconnectError } from "@/lib/google/oauth";
import { getAccessToken, getGoogleIntegration, markSynced } from "@/lib/google/tokens";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayBounds, isValidYmd, localDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string; google?: string }>;
}) {
  const params = await searchParams;
  const tz = config.timezone;
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

  // --- Google : token + agenda du jour choisi ---
  const integration = await getGoogleIntegration(supabase, user.id);
  let etatGoogle: EtatGoogle = integration ? "connecte" : "non_connecte";
  let analyse: AnalyseJournee | null = null;
  let erreurAgenda: string | null = integration ? null : "Connecte Google pour voir ton agenda.";
  let derniereSync = integration?.derniere_synchronisation ?? null;

  if (integration) {
    try {
      const token = await getAccessToken(supabase, user.id);
      const { debut, fin } = dayBounds(jour, tz);
      const events = await listEvents(token, debut, fin);
      analyse = analyserJournee(events, jour, tz, { debut: config.journeeDebut, fin: config.journeeFin });
      await markSynced(supabase, user.id);
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
        <Vide>Arrive à la phase (d).</Vide>
      </Section>

      <AgendaSection jour={jour} aujourdhui={aujourdhui} tz={tz} analyse={analyse} erreur={erreurAgenda} />

      <Section id="emails" titre="Emails">
        <Vide>Arrive à la phase (c).</Vide>
      </Section>

      <Section id="taches" titre="Tâches">
        <Vide>Arrive à la phase (d).</Vide>
      </Section>

      <Section id="alertes" titre="Alertes croisées">
        <Vide>Arrive à la phase (d).</Vide>
      </Section>

      <ConnexionsSection
        etat={etatGoogle}
        derniereSync={derniereSync}
        tz={tz}
        retour={params.google}
      />
    </main>
  );
}
