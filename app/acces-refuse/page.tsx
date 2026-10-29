import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccesRefusePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Accès refusé</CardTitle>
          <CardDescription>Cette application est privée. Ce compte n&apos;est pas autorisé.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Retour</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
