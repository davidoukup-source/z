import { NextResponse } from "next/server";

import { isAllowedEmail } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

// Retour de la connexion Google gérée par Supabase Auth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!isAllowedEmail(data.user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/acces-refuse`);
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erreur=connexion`);
}
