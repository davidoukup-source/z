"use server";

import { redirect } from "next/navigation";

import { config } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${config.appUrl}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?erreur=connexion");
  redirect(data.url);
}
