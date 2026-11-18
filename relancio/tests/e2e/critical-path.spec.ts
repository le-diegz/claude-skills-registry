import { expect, test } from "@playwright/test";
import { confirmationLink, frDate } from "./helpers";

test("parcours critique complet : inscription → import → relance → acceptation → dashboard", async ({ page }) => {
  const email = `e2e-${Date.now()}@relancio.test`;
  const password = "MotDePasse2026";

  // 1. Inscription
  await page.goto("/inscription");
  await page.getByLabel("Nom et prénom").fill("Julie Artisan");
  await page.getByLabel("Email professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/verifier-email**");
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte email" })).toBeVisible();

  // Vérification de l'email (lien reçu par email)
  await page.goto(await confirmationLink(email));
  await page.waitForURL("**/onboarding");

  // 2. Création de l'entreprise
  await page.getByLabel("Nom de l'entreprise (utilisé dans les relances)").fill("Clim Confort E2E");
  await page.getByRole("button", { name: "Climatisation" }).click();
  await page.getByTestId("org-submit").click();
  await expect(page.getByText("Importer mes devis en cours")).toBeVisible();

  // 3. Import de devis (CSV point-virgule, décimales et dates françaises, encodage Windows)
  await page.getByTestId("onboarding-import").click();
  const csv = [
    "Numéro;Client;Email;Objet;Total HT;TVA;Date d'envoi;Statut",
    `E2E-001;Mme Lucie Bernard;lucie.bernard@exemple.test;Climatisation réversible séjour;3 450,00;10 %;${frDate(10)};Envoyé`,
    `E2E-002;M. Paul Henry;paul.henry@exemple.test;PAC air/eau 11 kW;12 800,00;5,5 %;${frDate(1)};En attente`,
    `E2E-003;;sans-nom@exemple.test;Ligne invalide;abc;20 %;${frDate(3)};Envoyé`,
  ].join("\r\n");
  const latin1 = Buffer.from(csv.replace(/[^\x00-\xff]/g, "?"), "latin1");
  await page.getByTestId("import-file-input").setInputFiles({ name: "export-devis.csv", mimeType: "text/csv", buffer: latin1 });
  await expect(page.getByText("Correspondance des colonnes")).toBeVisible();
  await page.getByTestId("import-validate").click();
  await expect(page.getByText("Prêts à importer")).toBeVisible();
  await page.getByTestId("import-run").click();
  await expect(page.getByTestId("import-report")).toHaveText("2 devis importés");
  await page.getByTestId("onboarding-next-2").click();

  // 4. Délais de relance (réglages recommandés) puis découverte
  await page.getByRole("button", { name: "Garder les réglages recommandés" }).click();
  await page.getByTestId("onboarding-finish").click();
  await page.waitForURL("**/tableau-de-bord**");

  // 5. Le devis envoyé il y a 10 jours apparaît à relancer
  await expect(page.getByTestId("kpi-open")).toContainText("2");
  await expect(page.getByTestId("kpi-overdue")).toContainText("1");
  await page.goto("/relances");
  const row = page.getByTestId("followup-row").filter({ hasText: "Lucie Bernard" });
  await expect(row).toBeVisible();

  // 6. Message généré, modifié puis validé
  await row.click();
  const body = page.getByLabel("Message");
  await expect(body).toContainText("E2E-001");
  await body.fill((await body.inputValue()) + "\nJe peux passer jeudi pour en discuter.");
  await page.getByTestId("approve-followup").click();
  await expect(page.getByText("Relance validée").first()).toBeVisible();

  // 7. Le panneau reste ouvert : copie possible, puis enregistrement de l'envoi (mode manuel)
  await expect(page.getByRole("dialog").getByText("Validée").first()).toBeVisible();
  await expect(page.getByLabel("Message")).toContainText("passer jeudi");
  await expect(page.getByRole("button", { name: "Copier" })).toBeVisible();
  await page.getByTestId("mark-sent").click();
  await expect(page.getByText("Relance enregistrée comme envoyée").first()).toBeVisible();

  // 8. Passage du devis en « Accepté »
  await page.goto("/devis?q=E2E-001");
  await page.getByTestId("quote-row").first().click();
  await expect(page.getByTestId("quote-reference")).toHaveText("E2E-001");
  await expect(page.getByText("Relance n°1").first()).toBeVisible();
  await page.getByTestId("mark-accepted").click();
  await expect(page.getByText("Statut mis à jour").first()).toBeVisible();

  // 9. Relances futures annulées
  await page.reload();
  await expect(page.getByText("Le devis est clôturé")).toBeVisible();
  await expect(page.getByText("Annulée").first()).toBeVisible();

  // 10. Dashboard et statistiques mis à jour
  await page.goto("/tableau-de-bord");
  await expect(page.getByTestId("kpi-open")).toContainText("1");
  await expect(page.getByTestId("kpi-accepted")).toContainText("1");
  await page.goto("/statistiques?periode=30j");
  await expect(page.getByTestId("stat-accepted")).toContainText("1");
  await expect(page.getByTestId("stat-followups")).toContainText("1");
});
