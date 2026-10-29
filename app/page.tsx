import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Phase (a) : squelette de la page. Les sections se remplissent aux phases suivantes.
const SECTIONS = [
  { id: "une-ligne", titre: "Aujourd'hui en une ligne", phase: "d" },
  { id: "agenda", titre: "Agenda", phase: "b" },
  { id: "emails", titre: "Emails", phase: "c" },
  { id: "taches", titre: "Tâches", phase: "d" },
  { id: "alertes", titre: "Alertes croisées", phase: "d" },
  { id: "connexions", titre: "Statut des connexions", phase: "b" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de Vie</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button variant="outline" size="sm" type="submit">
            Déconnexion
          </Button>
        </form>
      </header>

      {SECTIONS.map((s) => (
        <Card key={s.id} id={s.id}>
          <CardHeader>
            <CardTitle>{s.titre}</CardTitle>
            <CardDescription>Arrive à la phase ({s.phase}).</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </main>
  );
}
