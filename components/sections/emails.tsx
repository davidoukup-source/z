import { Badge } from "@/components/ui/badge";
import type { EmailClasse, ResultatEmails } from "@/lib/emails";
import { formatDateHeure } from "@/lib/time";

import { Section, Vide } from "./section";

function joursDepuis(date: Date): number {
  return Math.floor((Date.now() - +date) / 86_400_000);
}

function CarteEmail({ e, tz, attente }: { e: EmailClasse; tz: string; attente?: boolean }) {
  return (
    <li>
      <a
        href={e.lien}
        target="_blank"
        rel="noreferrer"
        className="block rounded-md border px-3 py-2 transition-colors hover:bg-accent"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground">{e.expediteurNom}</span>
          {e.prioritaire && <Badge>Prioritaire</Badge>}
          {e.nonLu && <Badge variant="secondary">Non lu</Badge>}
          {attente && <span>sans réponse depuis {joursDepuis(e.dernierMessage)} j</span>}
          {e.dateLimite && <Badge variant="outline">Échéance {formatDateHeure(e.dateLimite, tz)}</Badge>}
        </div>
        <p className="mt-1 truncate text-sm font-medium">{e.sujet}</p>
        <p className="text-sm text-muted-foreground">{e.resume}</p>
      </a>
    </li>
  );
}

export function EmailsSection({
  resultat,
  erreur,
  tz,
}: {
  resultat: ResultatEmails | null;
  erreur: string | null;
  tz: string;
}) {
  return (
    <Section
      id="emails"
      titre="Emails"
      description={
        resultat
          ? `${resultat.repondre.length} à traiter aujourd'hui · ${resultat.informatifs.length} informatifs`
          : undefined
      }
    >
      {erreur && <Vide>{erreur}</Vide>}
      {resultat && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">À répondre aujourd&apos;hui</h3>
            {resultat.repondre.length === 0 ? (
              <Vide>Rien d&apos;urgent.</Vide>
            ) : (
              <ul className="flex flex-col gap-2">
                {resultat.repondre.map((e) => (
                  <CarteEmail key={e.threadId} e={e} tz={tz} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">En attente de réponse</h3>
            {resultat.attente.length === 0 ? (
              <Vide>Personne ne te doit de réponse depuis plus de 3 jours.</Vide>
            ) : (
              <ul className="flex flex-col gap-2">
                {resultat.attente.map((e) => (
                  <CarteEmail key={e.threadId} e={e} tz={tz} attente />
                ))}
              </ul>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Informatifs (newsletters, notifications) : <span className="font-medium">{resultat.informatifs.length}</span>
          </p>
        </div>
      )}
    </Section>
  );
}

export function EmailsChargement() {
  return (
    <Section id="emails" titre="Emails">
      <Vide>Tri des emails en cours…</Vide>
    </Section>
  );
}
