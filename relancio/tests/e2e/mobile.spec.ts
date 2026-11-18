import { expect, test } from "@playwright/test";
import { startDemo } from "./helpers";

test("navigation mobile : tableau de bord, barre basse et ajout rapide", async ({ page }) => {
  await startDemo(page);
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  await expect(page.getByTestId("kpi-open")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Relances" }).click();
  await expect(page).toHaveURL(/\/relances$/);
  await expect(page.getByRole("heading", { name: "Relances" })).toBeVisible();
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Ajouter un devis" }).click();
  await expect(page.getByRole("dialog", { name: "Ajouter un devis" })).toBeVisible();
});
