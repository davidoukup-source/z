import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt } from "@/lib/crypto";

import { GOOGLE_PROVIDER, GoogleReconnectError, refreshAccessToken } from "./oauth";

// Cache mémoire par instance serverless, pour ne pas renouveler le token à chaque appel.
const cache = new Map<string, { token: string; expiresAt: number }>();
const MARGE_MS = 2 * 60_000;

export type GoogleIntegration = {
  refresh_token_chiffre: string;
  derniere_synchronisation: string | null;
};

export async function getGoogleIntegration(
  supabase: SupabaseClient,
  userId: string
): Promise<GoogleIntegration | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select("refresh_token_chiffre, derniere_synchronisation")
    .eq("user_id", userId)
    .eq("fournisseur", GOOGLE_PROVIDER)
    .maybeSingle();
  if (error) throw new Error(`Lecture des intégrations impossible : ${error.message}`);
  return data;
}

// Renvoie un access token valide, renouvelé automatiquement s'il expire bientôt.
export async function getAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt - MARGE_MS > Date.now()) return cached.token;

  const integration = await getGoogleIntegration(supabase, userId);
  if (!integration) throw new GoogleReconnectError("Google n'est pas encore connecté.");

  const tokens = await refreshAccessToken(decrypt(integration.refresh_token_chiffre));
  cache.set(userId, { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 });
  return tokens.access_token;
}

export function clearAccessToken(userId: string) {
  cache.delete(userId);
}

export async function markSynced(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("integrations")
    .update({ derniere_synchronisation: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("fournisseur", GOOGLE_PROVIDER);
}

// Appel GET authentifié vers une API Google (lecture seule).
export async function googleGet<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 401) throw new GoogleReconnectError();
  if (!res.ok) throw new Error(`Erreur API Google ${res.status} : ${await res.text()}`);
  return (await res.json()) as T;
}
