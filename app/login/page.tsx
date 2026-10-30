import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { signInWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; detail?: string }>;
}) {
  const { erreur, detail } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Tableau de Vie</CardTitle>
          <CardDescription>Accès privé. Connecte-toi avec ton compte Google.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {erreur && (
            <div className="text-sm">
              <p className="text-destructive">La connexion a échoué. Réessaie.</p>
              {detail && <p className="mt-1 break-words text-muted-foreground">Détail : {detail}</p>}
            </div>
          )}
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
