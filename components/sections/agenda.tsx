import Link from "next/link";
import { Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalyseJournee, Creneau } from "@/lib/agenda";
import type { CalEvent } from "@/lib/google/calendar";
import { addDays, formatDuree, formatJourCourt, formatJourLong, localTime, minutesBetween } from "@/lib/time";
import { cn } from "@/lib/utils";

import { Section, Vide } from "./section";

type Element = { type: "evenement"; e: CalEvent } | { type: "libre"; c: Creneau };

export function AgendaSection({
  jour,
  aujourdhui,
  tz,
  analyse,
  erreur,
}: {
  jour: string;
  aujourdhui: string;
  tz: string;
  analyse: AnalyseJournee | null;
  erreur: string | null;
}) {
  const jours = Array.from({ length: 7 }, (_, i) => addDays(aujourdhui, i));

  const elements: Element[] = analyse
    ? [
        ...analyse.evenements.map((e) => ({ type: "evenement" as const, e })),
        ...analyse.libres.map((c) => ({ type: "libre" as const, c })),
      ].sort((a, b) => +(a.type === "evenement" ? a.e.debut : a.c.debut) - +(b.type === "evenement" ? b.e.debut : b.c.debut))
    : [];

  return (
    <Section id="agenda" titre="Agenda" description={<span className="capitalize">{formatJourLong(jour, tz)}</span>}>
      <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Choisir un jour">
        {jours.map((j) => (
          <Button key={j} asChild size="sm" variant={j === jour ? "default" : "outline"} className="capitalize">
            <Link href={j === aujourdhui ? "/#agenda" : `/?jour=${j}#agenda`} scroll={false}>
              {j === aujourdhui ? "Aujourd'hui" : formatJourCourt(j, tz)}
            </Link>
          </Button>
        ))}
      </nav>

      {erreur && <Vide>{erreur}</Vide>}

      {analyse && (
        <div className="flex flex-col gap-3">
          {analyse.journeeEntiere.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {analyse.journeeEntiere.map((e) => (
                <Badge key={e.id} variant="outline">
                  Toute la journée · {e.titre}
                </Badge>
              ))}
            </div>
          )}

          {elements.length === 0 && <Vide>Aucun événement.</Vide>}

          <ol className="relative flex flex-col gap-2 border-l pl-4">
            {elements.map((el) =>
              el.type === "evenement" ? (
                <EvenementItem
                  key={el.e.id}
                  e={el.e}
                  tz={tz}
                  conflit={analyse.conflits.has(el.e.id)}
                  serre={analyse.serres.has(el.e.id)}
                />
              ) : (
                <li
                  key={`libre-${+el.c.debut}`}
                  className="relative rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
                >
                  <span className="absolute top-3 -left-[21px] size-2 rounded-full border bg-background" />
                  {localTime(el.c.debut, tz)} – {localTime(el.c.fin, tz)} · Temps disponible (
                  {formatDuree(minutesBetween(el.c.debut, el.c.fin))})
                </li>
              )
            )}
          </ol>
        </div>
      )}
    </Section>
  );
}

function EvenementItem({ e, tz, conflit, serre }: { e: CalEvent; tz: string; conflit: boolean; serre: boolean }) {
  return (
    <li className={cn("relative rounded-md border px-3 py-2", conflit && "border-foreground border-2")}>
      <span className="absolute top-3 -left-[21px] size-2 rounded-full bg-foreground" />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-sm tabular-nums">
          {localTime(e.debut, tz)} – {localTime(e.fin, tz)}
        </span>
        <span className="text-xs text-muted-foreground">{formatDuree(minutesBetween(e.debut, e.fin))}</span>
        {conflit && <Badge>Conflit</Badge>}
        {serre && !conflit && <Badge variant="secondary">Enchaînement &lt; 15 min</Badge>}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        {e.lienAgenda ? (
          <a href={e.lienAgenda} target="_blank" rel="noreferrer" className="font-medium hover:underline">
            {e.titre}
          </a>
        ) : (
          <span className="font-medium">{e.titre}</span>
        )}
        {e.lienVisio && (
          <Button asChild size="sm" variant="outline">
            <a href={e.lienVisio} target="_blank" rel="noreferrer">
              <Video /> Rejoindre
            </a>
          </Button>
        )}
      </div>
    </li>
  );
}
