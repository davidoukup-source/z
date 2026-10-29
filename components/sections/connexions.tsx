import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateHeure } from "@/lib/time";

import { Section } from "./section";

export type EtatGoogle = "connecte" | "expire" | "non_connecte" | "erreur";

const MESSAGES: Record<string, string> = {
  connecte: "Google est connecté.",
  annule: "Connexion Google annulée.",
  erreur_etat: "La connexion a expiré, réessaie.",
  refuse: "Accès refusé.",
  mauvais_compte: "Ce compte Google n'est pas le bon : utilise ton adresse autorisée.",
  scopes_manquants: "Coche bien l'accès à l'agenda et à Gmail sur l'écran Google.",
  sans_refresh_token: "Google n'a pas fourni de jeton longue durée. Réessaie.",
  erreur: "La connexion Google a échoué. Réessaie.",
};

const LIBELLES: Record<EtatGoogle, string> = {
  connecte: "Connecté",
  expire: "À reconnecter",
  non_connecte: "Non connecté",
  erreur: "Erreur",
};

export function ConnexionsSection({
  etat,
  derniereSync,
  tz,
  retour,
}: {
  etat: EtatGoogle;
  derniereSync: string | null;
  tz: string;
  retour?: string;
}) {
  return (
    <Section id="connexions" titre="Statut des connexions">
      {retour && MESSAGES[retour] && <p className="mb-3 text-sm">{MESSAGES[retour]}</p>}
      <ul className="flex flex-col gap-2">
        <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">Google (Agenda + Gmail)</span>
              <Badge variant={etat === "connecte" ? "secondary" : "default"}>{LIBELLES[etat]}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Dernière synchronisation : {derniereSync ? formatDateHeure(new Date(derniereSync), tz) : "jamais"}
            </span>
            {etat === "expire" && (
              <span className="text-xs text-muted-foreground">
                En mode Test, Google coupe l&apos;accès tous les 7 jours.
              </span>
            )}
          </div>
          <Button asChild size="sm" variant={etat === "connecte" ? "outline" : "default"}>
            {/* Lien classique (pas next/link) : on quitte l'app vers Google. */}
            <a href="/api/google/connect">{etat === "non_connecte" ? "Connecter" : "Reconnecter"}</a>
          </Button>
        </li>
      </ul>
    </Section>
  );
}
