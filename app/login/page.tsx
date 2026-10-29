import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { signInWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Tableau de Vie</CardTitle>
          <CardDescription>Accès privé. Connecte-toi avec ton compte Google.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {erreur && <p className="text-sm text-destructive">La connexion a échoué. Réessaie.</p>}
          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full">
              Se connecter avec Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
