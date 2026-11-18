import { describe, expect, it } from "vitest";
import {
  buildCsvTemplate,
  decodeCsv,
  detectDelimiter,
  guessMapping,
  missingRequiredFields,
  parseCsv,
  parseImportStatus,
  parseServiceType,
  summarizeValidation,
  validateImportRows,
  csvEscape,
} from "@/lib/domain/csv-import";

const SEMI = `Numéro;Client;Email;Objet;Total HT;TVA;Date;Statut
DEV-001;Mme Martin;martin@exemple.fr;Clim séjour;3 450,00;10%;02/11/2026;Envoyé
DEV-002;M. Durand;pas-un-email;PAC air/eau;12 800,00;5,5 %;28/10/2026;Signé
DEV-003;;x@y.fr;Chaudière;abc;20%;01/11/2026;
DEV-001;Doublon;d@d.fr;Clim;100;20%;01/11/2026;
DEV-009;Ancien;a@a.fr;Clim;100;20%;01/11/2026;`;

describe("décodage", () => {
  it("décode UTF-8 avec BOM", () => {
    const bytes = new TextEncoder().encode("﻿Référence;Client\n");
    expect(decodeCsv(bytes)).toEqual({ text: "Référence;Client\n", encoding: "utf-8" });
  });
  it("bascule en Windows-1252 (export Excel)", () => {
    const bytes = new Uint8Array([0x52, 0xe9, 0x66, 0xe9, 0x72, 0x65, 0x6e, 0x63, 0x65]); // « Référence » en cp1252
    expect(decodeCsv(bytes)).toEqual({ text: "Référence", encoding: "windows-1252" });
  });
});

describe("séparateur et analyse", () => {
  it("détecte point-virgule et virgule", () => {
    expect(detectDelimiter(SEMI)).toBe(";");
    expect(detectDelimiter('ref,client,montant\n"A,1",Martin,"1 200,50"\n')).toBe(",");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });
  it("gère les champs entre guillemets contenant le séparateur", () => {
    const parsed = parseCsv('ref,client,montant\n"A,1",Martin,"1 200,50"\n');
    expect(parsed.rows[0]).toEqual(["A,1", "Martin", "1 200,50"]);
  });
});

describe("mapping automatique", () => {
  it("reconnaît les en-têtes usuels", () => {
    const { headers } = parseCsv(SEMI);
    const m = guessMapping(headers);
    expect(m.reference).toBe(0);
    expect(m.customer_name).toBe(1);
    expect(m.customer_email).toBe(2);
    expect(m.title).toBe(3);
    expect(m.amount_ht).toBe(4);
    expect(m.vat_rate).toBe(5);
    expect(m.issued_on).toBe(6);
    expect(m.status).toBe(7);
    expect(missingRequiredFields(m)).toEqual([]);
  });
  it("signale les champs obligatoires manquants", () => {
    expect(missingRequiredFields({ reference: 0 })).toEqual(["Nom du client", "Montant HT ou TTC"]);
  });
  it("mappe le modèle téléchargeable", () => {
    const parsed = parseCsv(decodeCsv(new TextEncoder().encode(buildCsvTemplate())).text);
    const m = guessMapping(parsed.headers);
    const rows = validateImportRows(parsed, m, { existingReferences: [], today: "2026-11-18" });
    expect(rows.every((r) => r.errors.length === 0)).toBe(true);
    expect(rows[1].data?.vat_rate_bp).toBe(550);
    expect(rows[1].data?.customer.company_name).toBe("SCI Les Tilleuls");
  });
});

describe("validation", () => {
  const parsed = parseCsv(SEMI);
  const rows = validateImportRows(parsed, guessMapping(parsed.headers), { existingReferences: ["dev-009"], today: "2026-11-18" });

  it("convertit montants, TVA, dates et statuts", () => {
    const r = rows[0];
    expect(r.errors).toEqual([]);
    expect(r.data).toMatchObject({
      reference: "DEV-001",
      amount_ht_cents: 345000,
      amount_ttc_cents: 379500,
      vat_rate_bp: 1000,
      issued_on: "2026-11-02",
      sent_on: "2026-11-02",
      status: "sent",
      service_type: "climatisation",
    });
    expect(rows[1].data?.status).toBe("accepted");
    expect(rows[1].data?.service_type).toBe("pompe_a_chaleur");
  });
  it("avertit sur un email invalide sans bloquer", () => {
    expect(rows[1].warnings.some((w) => w.includes("Email invalide"))).toBe(true);
    expect(rows[1].data?.customer.email).toBeNull();
  });
  it("bloque les lignes en erreur", () => {
    expect(rows[2].errors).toContain("Nom du client manquant");
    expect(rows[2].errors.some((e) => e.includes("Montant HT illisible"))).toBe(true);
    expect(rows[2].data).toBeNull();
  });
  it("détecte les doublons dans le fichier et en base", () => {
    expect(rows[3].duplicate).toBe("file");
    expect(rows[4].duplicate).toBe("existing");
    expect(summarizeValidation(rows)).toMatchObject({ total: 5, valid: 2, duplicates: 2, errors: 1 });
  });
  it("déduit le HT depuis le TTC", () => {
    const p = parseCsv("ref;client;montant ttc;tva\nA;B;1 200,00;20%");
    const [r] = validateImportRows(p, guessMapping(p.headers), { existingReferences: [], today: "2026-11-18" });
    expect(r.data).toMatchObject({ amount_ttc_cents: 120000, amount_ht_cents: 100000, vat_rate_bp: 2000 });
  });
});

describe("interprétations", () => {
  it("statuts", () => {
    expect(parseImportStatus("Accepté")).toBe("accepted");
    expect(parseImportStatus("Bon pour accord")).toBe("accepted");
    expect(parseImportStatus("Perdu")).toBe("declined");
    expect(parseImportStatus("En attente")).toBe("sent");
    expect(parseImportStatus("Brouillon")).toBe("draft");
    expect(parseImportStatus("???")).toBeNull();
  });
  it("types de prestation", () => {
    expect(parseServiceType("", "Installation PAC air/eau")).toBe("pompe_a_chaleur");
    expect(parseServiceType("Plomberie")).toBe("plomberie");
    expect(parseServiceType("", "Remplacement chaudière gaz")).toBe("chauffage");
    expect(parseServiceType("", "Multisplit 3 unités")).toBe("climatisation");
  });
  it("protège l'export contre l'injection de formules", () => {
    const esc = csvEscape(";");
    expect(esc("=HYPERLINK()")).toBe("'=HYPERLINK()");
    expect(esc("-12,5")).toBe("-12,5");
    expect(esc("a;b")).toBe('"a;b"');
  });
});
