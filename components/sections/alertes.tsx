import { Badge } from "@/components/ui/badge";
import type { Alerte } from "@/lib/alertes";

import { Section, Vide } from "./section";

export function AlertesSection({ alertes, erreur, note }: { alertes: Alerte[] | null; erreur?: string | null; note?: string }) {
  return (
    <Section id="alertes" titre="Alertes croisées" description={note}>
      {erreur && <Vide>{erreur}</Vide>}
      {alertes && alertes.length === 0 && <Vide>Rien à signaler.</Vide>}
      {alertes && alertes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {alertes.map((a, i) => (
            <li key={i} className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
              <Badge variant="outline" className="shrink-0">
                {a.type}
              </Badge>
              {a.lien ? (
                <a href={a.lien} target="_blank" rel="noreferrer" className="text-sm hover:underline">
                  {a.texte}
                </a>
              ) : (
                <span className="text-sm">{a.texte}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
