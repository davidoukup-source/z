"use server";

import { revalidatePath } from "next/cache";

import { genererEtEnvoyerResume } from "@/lib/brief";
import { isAllowedEmail } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type EtatResume = { message: string } | undefined;

// Bouton "Envoyer le résumé maintenant" : renvoie même si le résumé du jour est déjà parti.
export async function envoyerResumeMaintenant(): Promise<EtatResume> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return { message: "Non autorisé." };

  try {
    const r = await genererEtEnvoyerResume({ supabase, userId: user.id, forcer: true });
    revalidatePath("/");
    return { message: r.envoye ? "Résumé envoyé : regarde ta boîte mail." : "Résumé généré, mais l'envoi a échoué (vérifie RESEND_API_KEY)." };
  } catch (e) {
    console.error("Résumé manuel :", e);
    return { message: "Impossible de générer le résumé." };
  }
}
