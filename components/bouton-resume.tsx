"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { envoyerResumeMaintenant } from "@/app/actions/resume";
import { Button } from "@/components/ui/button";

export function BoutonResume() {
  const [etat, action, enCours] = useActionState(envoyerResumeMaintenant, undefined);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={enCours}>
        <Send /> {enCours ? "Envoi en cours…" : "Envoyer le résumé maintenant"}
      </Button>
      {etat && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {etat.message}
        </p>
      )}
    </form>
  );
}
