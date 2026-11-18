import { expect, test } from "@playwright/test";
import { startDemo } from "./helpers";

test("création d'un devis avec nouveau client en moins d'une minute", async ({ page }) => {
  await startDemo(page);
  const started = Date.now();
  await page.getByTestId("header-add-quote").click();
  await page.getByTestId("customer-combobox").click();
  await page.getByPlaceholder("Nom, email, téléphone…").fill("Mme Rapide Test");
  await page.getByText("Créer le client « Mme Rapide Test »").click();
  await page.getByLabel("Email").fill("rapide@exemple.test");
  await page.getByLabel("Titre du chantier").fill("Clim chambre parentale");
  await page.getByLabel("Montant HT").fill("2 480,50");
  await expect(page.getByLabel("Montant TTC")).toHaveValue("2976,60");
  await page.getByTestId("quote-submit").click();
  await page.waitForURL(/\/devis\/[0-9a-f-]{36}/);
  await expect(page.getByText("Clim chambre parentale")).toBeVisible();
  await expect(page.getByText(/Prochaine relance/)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(60_000);
});

test("détection de doublon client à la saisie", async ({ page }) => {
  await startDemo(page);
  await page.getByTestId("header-add-quote").click();
  await page.getByTestId("customer-combobox").click();
  await page.getByPlaceholder("Nom, email, téléphone…").fill("Claire Martin");
  await page.getByText("Créer le client « Claire Martin »").click();
  await expect(page.getByText("Client peut-être déjà existant")).toBeVisible();
});

test("recherche globale, filtres, export CSV et Kanban", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByPlaceholder("Référence, client, chantier, email…").fill("Benali");
  await expect(page.getByRole("option").filter({ hasText: "Karim Benali" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/devis?statut=accepted");
  await expect(page.getByTestId("quote-row").first()).toContainText("Accepté");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/relancio-devis-.*\.csv/);
  await page.goto("/devis?vue=kanban");
  await expect(page.getByRole("region", { name: "À relancer" })).toBeVisible();
});
