import type { Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Récupère le lien de confirmation envoyé par Supabase Auth (Mailpit en local). */
export async function confirmationLink(email: string, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const json = (await res.json()) as { messages?: { ID: string }[] };
    if (json.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${json.messages[0].ID}`)).json()) as { HTML: string; Text: string };
      const m = (msg.HTML || msg.Text).match(/href="([^"]*\/auth\/confirm[^"]*)"/);
      if (m) return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun email de confirmation pour ${email}`);
}

export function frDate(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export async function startDemo(page: Page) {
  await page.goto("/demo");
  await page.waitForURL("**/tableau-de-bord");
  await page.getByTestId("kpi-open").waitFor();
}
