// Mini-convertisseur Markdown → HTML pour l'email (titres, listes, gras, liens).

function echapper(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function enLigne(texte: string): string {
  return echapper(texte)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" style="color:#171717">$1</a>');
}

export function markdownVersHtml(markdown: string): string {
  const html: string[] = [];
  let liste = false;
  const fermerListe = () => {
    if (liste) html.push("</ul>");
    liste = false;
  };

  for (const ligne of markdown.split("\n")) {
    const l = ligne.trimEnd();
    if (/^# /.test(l)) {
      fermerListe();
      html.push(`<h1 style="font-size:20px;margin:0 0 16px">${enLigne(l.slice(2))}</h1>`);
    } else if (/^## /.test(l)) {
      fermerListe();
      html.push(`<h2 style="font-size:15px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#525252">${enLigne(l.slice(3))}</h2>`);
    } else if (/^\s*[-*] /.test(l)) {
      if (!liste) html.push('<ul style="margin:0;padding-left:20px">');
      liste = true;
      html.push(`<li style="margin:4px 0">${enLigne(l.replace(/^\s*[-*] /, ""))}</li>`);
    } else if (l.trim() === "") {
      fermerListe();
    } else {
      fermerListe();
      html.push(`<p style="margin:8px 0">${enLigne(l)}</p>`);
    }
  }
  fermerListe();

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f5">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.5;color:#171717">
<div style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:24px">
${html.join("\n")}
</div>
<p style="font-size:12px;color:#737373;margin:16px 4px">Tableau de Vie · résumé automatique</p>
</div></body></html>`;
}

export async function envoyerEmail(options: { a: string; sujet: string; markdown: string }): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) throw new Error("Variable d'environnement manquante : RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Tableau de Vie <onboarding@resend.dev>",
      to: [options.a],
      subject: options.sujet,
      html: markdownVersHtml(options.markdown),
      text: options.markdown,
    }),
  });
  if (!res.ok) throw new Error(`Envoi Resend impossible (${res.status}) : ${await res.text()}`);
}
