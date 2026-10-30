import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Modèles pour lesquels le repli automatique côté serveur ("fallbacks") est accepté.
const MODELES_AVEC_FALLBACK = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"]);

export function modele(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
}

// L'IA est optionnelle : sans clé, l'app utilise des règles simples (gratuit).
export function iaActivee(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Variable d'environnement manquante : ANTHROPIC_API_KEY");
  client ??= new Anthropic();
  return client;
}

export class ClaudeRefusalError extends Error {}

// Un appel, une réponse JSON validée par le schéma Zod.
export async function demanderJson<S extends z.ZodType>(options: {
  schema: S;
  system: string;
  message: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const model = modele();
  const avecFallback = MODELES_AVEC_FALLBACK.has(model);

  const response = await anthropic().beta.messages.parse({
    model,
    max_tokens: options.maxTokens ?? 8000,
    system: options.system,
    messages: [{ role: "user", content: options.message }],
    output_config: { effort: options.effort ?? "low", format: betaZodOutputFormat(options.schema) },
    ...(avecFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });

  if (response.stop_reason === "refusal") {
    throw new ClaudeRefusalError(`Claude a refusé la demande (${response.stop_details?.category ?? "sans catégorie"}).`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("Réponse de Claude tronquée (max_tokens).");
  if (!response.parsed_output) throw new Error("Réponse de Claude illisible.");
  return response.parsed_output as z.infer<S>;
}
