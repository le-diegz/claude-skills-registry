"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { assertNoError, fail, ok, runAction, type ActionResult } from "@/lib/actions";
import { QUOTE_STATUSES, SERVICE_TYPES } from "@/lib/domain/constants";
import { customerMatchKeys } from "@/lib/domain/csv-import";
import { sentAtFromDate } from "@/lib/services/quotes";
import { syncQuoteFollowups, prepareDueFollowups } from "@/lib/services/followups";
import { logActivity } from "@/lib/services/activity";
import { notifyMembers } from "@/lib/services/notifications";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import type { Json } from "@/lib/db/database.types";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optStr = (max: number) => z.string().trim().max(max).nullable();

const dataSchema = z
  .object({
    reference: z.string().trim().min(1).max(60),
    title: z.string().trim().min(1).max(200),
    service_type: z.enum(SERVICE_TYPES),
    amount_ht_cents: z.number().int().min(0).max(99_999_999_999),
    amount_ttc_cents: z.number().int().min(0).max(99_999_999_999),
    vat_rate_bp: z.number().int().min(0).max(10000).nullable(),
    issued_on: date,
    sent_on: date.nullable(),
    expires_on: date.nullable(),
    status: z.enum(QUOTE_STATUSES).refine((s) => s !== "to_follow_up" && s !== "followed_up"),
    notes: optStr(5000),
    customer: z.object({
      name: z.string().trim().min(1).max(160),
      company_name: optStr(160),
      email: z.string().trim().toLowerCase().email().max(254).nullable(),
      phone: optStr(30),
      address_line: optStr(200),
      postal_code: optStr(10),
      city: optStr(120),
    }),
  })
  .refine((d) => d.amount_ttc_cents >= d.amount_ht_cents, "TTC inférieur au HT")
  .refine((d) => !d.expires_on || d.expires_on >= d.issued_on, "Expiration avant la date du devis");

const rowSchema = z.object({
  rowNumber: z.number().int().min(1),
  raw: z.record(z.string(), z.string().max(2000)),
  data: dataSchema.nullable(),
  errors: z.array(z.string().max(300)).max(30),
});

const batchSchema = z.object({
  jobId: z.string().uuid().nullable(),
  fileName: z.string().trim().min(1).max(200),
  delimiter: z.string().max(2),
  encoding: z.string().max(20),
  mapping: z.record(z.string(), z.number().int().min(0).max(500)),
  total: z.number().int().min(0).max(20000),
  rows: z.array(rowSchema).max(250),
  final: z.boolean(),
});

export async function getExistingReferencesAction(): Promise<ActionResult<string[]>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const { data } = await ctx.supabase.from("quotes").select("reference").eq("organization_id", ctx.organization.id).limit(50000);
    return ok((data ?? []).map((r) => r.reference));
  });
}

export interface ImportBatchResult {
  jobId: string;
  imported: number;
  skipped: number;
  errors: number;
  createdCustomers: number;
  rowErrors: { rowNumber: number; message: string }[];
  dueNow?: number;
}

export async function importQuotesBatchAction(input: z.input<typeof batchSchema>): Promise<ActionResult<ImportBatchResult>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = batchSchema.safeParse(input);
    if (!parsed.success) return fail("Données d'import invalides. Rechargez le fichier.");
    const p = parsed.data;
    const db = ctx.supabase;
    const orgId = ctx.organization.id;

    let jobId = p.jobId;
    if (!jobId) {
      await enforceRateLimit("import", 30, 3600, ctx.organization.id);
      const { data: job, error } = await db
        .from("import_jobs")
        .insert({ organization_id: orgId, file_name: p.fileName, delimiter: p.delimiter, encoding: p.encoding, mapping: p.mapping as NonNullable<Json>, total_rows: p.total, created_by: ctx.user.id })
        .select("id")
        .single();
      assertNoError(error, "Création de l'import");
      jobId = job!.id;
    } else {
      const { data: job } = await db.from("import_jobs").select("id, status").eq("id", jobId).eq("organization_id", orgId).maybeSingle();
      if (!job || job.status !== "processing") return fail("Import introuvable ou déjà terminé.");
    }

    // Clients existants indexés par email / téléphone / nom normalisé
    const { data: customers } = await db.from("customers").select("id, name, email, phone").eq("organization_id", orgId).limit(20000);
    const byKey = new Map<string, string>();
    for (const c of customers ?? []) for (const k of customerMatchKeys(c)) if (!byKey.has(k)) byKey.set(k, c.id);

    const refs = p.rows.filter((r) => r.data).map((r) => r.data!.reference);
    const { data: existingRefs } = refs.length
      ? await db.from("quotes").select("reference").eq("organization_id", orgId).in("reference", refs)
      : { data: [] as { reference: string }[] };
    const taken = new Set((existingRefs ?? []).map((r) => r.reference.toLowerCase()));

    const result: ImportBatchResult = { jobId, imported: 0, skipped: 0, errors: 0, createdCustomers: 0, rowErrors: [] };
    const importRows: { organization_id: string; import_job_id: string; row_number: number; status: string; quote_id: string | null; raw: NonNullable<Json>; errors: string[] }[] = [];
    const toSync: string[] = [];

    for (const row of p.rows) {
      const base = { organization_id: orgId, import_job_id: jobId, row_number: row.rowNumber, raw: row.raw as NonNullable<Json> };
      if (!row.data) {
        result.errors++;
        result.rowErrors.push({ rowNumber: row.rowNumber, message: row.errors.join(" ; ") || "Ligne invalide" });
        importRows.push({ ...base, status: "error", quote_id: null, errors: row.errors.length ? row.errors : ["Ligne invalide"] });
        continue;
      }
      const d = row.data;
      if (taken.has(d.reference.toLowerCase())) {
        result.skipped++;
        importRows.push({ ...base, status: "skipped_duplicate", quote_id: null, errors: ["Référence déjà existante"] });
        continue;
      }
      try {
        let customerId: string | undefined;
        for (const k of customerMatchKeys(d.customer)) {
          customerId = byKey.get(k);
          if (customerId) break;
        }
        if (!customerId) {
          const { data: created, error } = await db
            .from("customers")
            .insert({ organization_id: orgId, ...d.customer, customer_type: d.customer.company_name ? "professionnel" : "particulier", created_by: ctx.user.id })
            .select("id, name, email, phone")
            .single();
          assertNoError(error, "Client");
          customerId = created!.id;
          result.createdCustomers++;
          for (const k of customerMatchKeys(created!)) byKey.set(k, customerId);
        }
        const status = d.status;
        const { data: quote, error: qErr } = await db
          .from("quotes")
          .insert({
            organization_id: orgId,
            customer_id: customerId,
            reference: d.reference,
            title: d.title,
            service_type: d.service_type,
            amount_ht_cents: d.amount_ht_cents,
            amount_ttc_cents: d.amount_ttc_cents,
            vat_rate_bp: d.vat_rate_bp,
            issued_on: d.issued_on,
            sent_at: status === "draft" || status === "cancelled" ? null : sentAtFromDate(d.sent_on ?? d.issued_on),
            expires_on: d.expires_on,
            status,
            notes: d.notes,
            owner_id: ctx.user.id,
            source: "import",
            import_job_id: jobId,
            created_by: ctx.user.id,
          })
          .select("id")
          .single();
        if (qErr?.code === "23505") {
          result.skipped++;
          importRows.push({ ...base, status: "skipped_duplicate", quote_id: null, errors: ["Référence déjà existante"] });
          continue;
        }
        assertNoError(qErr, "Devis");
        taken.add(d.reference.toLowerCase());
        result.imported++;
        importRows.push({ ...base, status: "imported", quote_id: quote!.id, errors: [] });
        if (status === "sent") toSync.push(quote!.id);
      } catch (e) {
        result.errors++;
        const msg = e instanceof Error ? e.message.slice(0, 200) : "Erreur";
        result.rowErrors.push({ rowNumber: row.rowNumber, message: msg });
        importRows.push({ ...base, status: "error", quote_id: null, errors: [msg] });
      }
    }

    if (importRows.length) {
      const { error } = await db.from("import_rows").insert(importRows);
      if (error) console.error("[import_rows]", error.message);
    }
    for (const id of toSync) await syncQuoteFollowups(db, id, { actorId: ctx.user.id });

    // Cumul des compteurs
    const { data: job } = await db.from("import_jobs").select("imported_rows, skipped_rows, error_rows, created_customers").eq("id", jobId).single();
    const totals = {
      imported_rows: (job?.imported_rows ?? 0) + result.imported,
      skipped_rows: (job?.skipped_rows ?? 0) + result.skipped,
      error_rows: (job?.error_rows ?? 0) + result.errors,
      created_customers: (job?.created_customers ?? 0) + result.createdCustomers,
    };
    await db
      .from("import_jobs")
      .update({ ...totals, ...(p.final ? { status: "completed", completed_at: new Date().toISOString() } : {}) })
      .eq("id", jobId);

    if (p.final) {
      const { prepared } = await prepareDueFollowups(db, { organizationId: orgId });
      result.dueNow = prepared;
      await logActivity(db, {
        organizationId: orgId,
        type: "import_completed",
        message: `Import « ${p.fileName} » : ${totals.imported_rows} devis importés, ${totals.skipped_rows} doublons ignorés, ${totals.error_rows} erreurs`,
        actorId: ctx.user.id,
        metadata: { import_job_id: jobId, ...totals },
      });
      await notifyMembers(db, {
        organizationId: orgId,
        type: "import_completed",
        title: "Import terminé",
        body: `${totals.imported_rows} devis importés depuis ${p.fileName}.`,
        link: `/devis`,
        userIds: [ctx.user.id],
        dedupeKey: `import:${jobId}`,
      });
      revalidatePath("/", "layout");
    }
    return ok(result);
  });
}

export async function listImportJobsAction() {
  const ctx = await actionContext();
  const { data } = await ctx.supabase
    .from("import_jobs")
    .select("id, file_name, status, total_rows, imported_rows, skipped_rows, error_rows, created_at")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

