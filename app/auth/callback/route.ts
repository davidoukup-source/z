import { NextResponse } from "next/server";

import { isAllowedEmail } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

function echec(origin: string, detail: string) {
  console.error("Connexion Supabase :", detail);
  return NextResponse.redirect(`${origin}/login?erreur=connexion&detail=${encodeURIComponent(detail.slice(0, 200))}`);
}

// Retour de la connexion Google gérée par Supabase Auth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Supabase renvoie error / error_description quand Google refuse ou que la config est fausse.
  const erreurFournisseur = searchParams.get("error_description") ?? searchParams.get("error");
  if (erreurFournisseur) return echec(origin, erreurFournisseur);
  if (!code) return echec(origin, "Aucun code reçu de Supabase.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return echec(origin, error.message);

  if (!isAllowedEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/acces-refuse`);
  }
  return NextResponse.redirect(`${origin}/`);
}
