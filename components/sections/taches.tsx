"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";

import { changerStatut, creerTacheRapide, modifierTache, supprimerTache } from "@/app/actions/taches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Section, Vide } from "./section";

// Version sérialisable d'une tâche, avec les dates déjà formatées côté serveur.
export type TacheVue = {
  id: string;
  titre: string;
  description: string;
  priorite: "haute" | "moyenne" | "basse";
  statut: "en_attente" | "en_cours" | "terminee";
  projet: string;
  date: string; // YYYY-MM-DD local ou ""
  heure: string; // HH:MM local ou ""
  echeance: string; // texte affiché
};

export type GroupesVue = { titre: string; taches: TacheVue[]; vide: string }[];

const selectClasse =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function TachesSection({ groupes }: { groupes: GroupesVue }) {
  const [etat, action, enCours] = useActionState(creerTacheRapide, undefined);

  return (
    <Section id="taches" titre="Tâches" description="Ex. « payer l'électricité vendredi », « appeler Paul demain 14h #agence ! »">
      <form action={action} className="mb-1 flex gap-2">
        <Input name="texte" placeholder="Nouvelle tâche…" autoComplete="off" required maxLength={500} key={etat?.ok} />
        <Button type="submit" disabled={enCours}>
          Ajouter
        </Button>
      </form>
      <p className="mb-4 min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {etat?.erreur ?? (etat?.ok ? `Ajoutée : ${etat.ok}` : "")}
      </p>

      <div className="flex flex-col gap-5">
        {groupes.map((g) => (
          <div key={g.titre} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              {g.titre} <span className="font-normal text-muted-foreground">({g.taches.length})</span>
            </h3>
            {g.taches.length === 0 ? (
              <Vide>{g.vide}</Vide>
            ) : (
              <ul className="flex flex-col gap-2">
                {g.taches.map((t) => (
                  <LigneTache key={t.id} t={t} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function LigneTache({ t }: { t: TacheVue }) {
  const [edition, setEdition] = useState(false);
  const [enCours, demarrer] = useTransition();
  const terminee = t.statut === "terminee";

  return (
    <li className={cn("rounded-md border px-3 py-2", enCours && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={terminee ? "Marquer comme non terminée" : "Marquer comme terminée"}
          onClick={() => demarrer(() => changerStatut(t.id, terminee ? "en_attente" : "terminee"))}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
            terminee && "bg-foreground text-background"
          )}
        >
          {terminee && <Check className="size-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium break-words", terminee && "text-muted-foreground line-through")}>{t.titre}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {t.echeance && <span>{t.echeance}</span>}
            {t.priorite === "haute" && <Badge>Haute</Badge>}
            {t.priorite === "basse" && <Badge variant="outline">Basse</Badge>}
            {t.statut === "en_cours" && <Badge variant="secondary">En cours</Badge>}
            {t.projet && <Badge variant="outline">#{t.projet}</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEdition((v) => !v)}>
            <Pencil />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Supprimer"
            onClick={() => {
              if (confirm(`Supprimer « ${t.titre} » ?`)) demarrer(() => supprimerTache(t.id));
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {edition && <FormulaireTache t={t} fermer={() => setEdition(false)} />}
    </li>
  );
}

function FormulaireTache({ t, fermer }: { t: TacheVue; fermer: () => void }) {
  const [etat, action, enCours] = useActionState(async (prev: Awaited<ReturnType<typeof modifierTache>>, fd: FormData) => {
    const r = await modifierTache(prev, fd);
    if (r?.ok) fermer();
    return r;
  }, undefined);

  return (
    <form action={action} className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={t.id} />
      <label className="flex flex-col gap-1 text-xs sm:col-span-2">
        Titre
        <Input name="titre" defaultValue={t.titre} required maxLength={500} />
      </label>
      <label className="flex flex-col gap-1 text-xs sm:col-span-2">
        Description
        <textarea
          name="description"
          defaultValue={t.description}
          maxLength={5000}
          rows={2}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Date limite
        <Input type="date" name="date" defaultValue={t.date} />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Heure (facultatif)
        <Input type="time" name="heure" defaultValue={t.heure} />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Priorité
        <select name="priorite" defaultValue={t.priorite} className={selectClasse}>
          <option value="haute">Haute</option>
          <option value="moyenne">Moyenne</option>
          <option value="basse">Basse</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Statut
        <select name="statut" defaultValue={t.statut} className={selectClasse}>
          <option value="en_attente">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs sm:col-span-2">
        Projet
        <Input name="projet" defaultValue={t.projet} maxLength={100} />
      </label>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={enCours}>
          Enregistrer
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={fermer}>
          Annuler
        </Button>
        {etat?.erreur && <span className="text-xs text-destructive">{etat.erreur}</span>}
      </div>
    </form>
  );
}
