import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité · Tableau de Vie" };

export default function ConfidentialitePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 text-sm leading-relaxed sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Politique de confidentialité</h1>
      <p>
        Tableau de Vie est une application personnelle utilisée par une seule personne, son propriétaire. Aucun
        autre compte ne peut s&apos;y connecter.
      </p>
      <h2 className="text-base font-semibold">Données Google utilisées</h2>
      <p>
        Avec l&apos;accord explicite du propriétaire, l&apos;application lit en <strong>lecture seule</strong> son
        agenda Google (événements) et ses emails Gmail (expéditeur, objet, extrait). Elle ne peut ni envoyer, ni
        modifier, ni supprimer un email ou un événement.
      </p>
      <h2 className="text-base font-semibold">Stockage</h2>
      <p>
        Seuls sont enregistrés : le jeton d&apos;accès Google (chiffré), les tâches créées par le propriétaire, une
        catégorie et un résumé d&apos;une ligne par fil d&apos;email, et le résumé quotidien. Ces données sont
        stockées dans une base Supabase protégée, accessible uniquement au propriétaire.
      </p>
      <h2 className="text-base font-semibold">Partage</h2>
      <p>
        Les données ne sont ni vendues, ni partagées, ni utilisées à des fins publicitaires. Le résumé quotidien est
        envoyé par email au seul propriétaire via le service Resend.
      </p>
      <h2 className="text-base font-semibold">Révocation</h2>
      <p>
        L&apos;accès peut être retiré à tout moment depuis{" "}
        <a className="underline" href="https://myaccount.google.com/permissions">
          myaccount.google.com/permissions
        </a>
        .
      </p>
    </main>
  );
}
