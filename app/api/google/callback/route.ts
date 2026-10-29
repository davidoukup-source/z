import { NextResponse, type NextRequest } from "next/server";

import { isAllowedEmail } from "@/lib/config";
import { encrypt } from "@/lib/crypto";
import { emailFromIdToken, exchangeCode, GOOGLE_PROVIDER, GOOGLE_SCOPES } from "@/lib/google/oauth";
import { clearAccessToken } from "@/lib/google/tokens";
import { createClient } from "@/lib/supabase/server";

function retour(request: NextRequest, statut: string) {
  const response = NextResponse.redirect(new URL(`/?google=${statut}#connexions`, request.url));
  response.cookies.delete({ name: "google_oauth_state", path: "/api/google" });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (searchParams.get("error")) return retour(request, "annule");
  if (!code || !state || state !== request.cookies.get("google_oauth_state")?.value) {
    return retour(request, "erreur_etat");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return retour(request, "refuse");

  try {
    const tokens = await exchangeCode(code);

    if (!isAllowedEmail(emailFromIdToken(tokens.id_token))) return retour(request, "mauvais_compte");

    const accordes = tokens.scope.split(" ");
    if (!GOOGLE_SCOPES.filter((s) => s.startsWith("https://")).every((s) => accordes.includes(s))) {
      return retour(request, "scopes_manquants");
    }
    if (!tokens.refresh_token) return retour(request, "sans_refresh_token");

    const { error } = await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        fournisseur: GOOGLE_PROVIDER,
        refresh_token_chiffre: encrypt(tokens.refresh_token),
        derniere_synchronisation: new Date().toISOString(),
      },
      { onConflict: "user_id,fournisseur" }
    );
    if (error) throw error;

    clearAccessToken(user.id);
    return retour(request, "connecte");
  } catch (e) {
    console.error("Callback Google :", e);
    return retour(request, "erreur");
  }
}
