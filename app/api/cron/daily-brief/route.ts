import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { dansLaFenetreDEnvoi, genererEtEnvoyerResume } from "@/lib/brief";
import { config } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretValide(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const recu = Buffer.from(request.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

// Appelée par Vercel Cron, qui envoie automatiquement "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  if (!secretValide(request)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  // Deux crons (été / hiver) : seul celui qui tombe dans la bonne fenêtre envoie.
  if (!dansLaFenetreDEnvoi() && request.nextUrl.searchParams.get("forcer") !== "1") {
    return NextResponse.json({ statut: "hors_fenetre" });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  const user = data.users.find((u) => u.email?.toLowerCase() === config.allowedEmail);
  if (!user) return NextResponse.json({ erreur: "Utilisateur introuvable" }, { status: 404 });

  const resultat = await genererEtEnvoyerResume({ supabase, userId: user.id });
  return NextResponse.json({ statut: resultat.deja ? "deja_envoye" : resultat.envoye ? "envoye" : "echec_envoi" });
}
