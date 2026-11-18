"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { assertNoError, fail, ok, runAction, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/services/activity";
import { enforceRateLimit } from "@/lib/services/rate-limit";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/msword", "doc"],
  ["application/vnd.ms-excel", "xls"],
]);

function safeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80) || "fichier";
}

/** Vérifie la signature binaire des formats principaux (le type MIME déclaré n'est pas fiable). */
function magicMatches(mime: string, bytes: Uint8Array) {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (mime === "application/pdf") return starts([0x25, 0x50, 0x44, 0x46]);
  if (mime === "image/png") return starts([0x89, 0x50, 0x4e, 0x47]);
  if (mime === "image/jpeg") return starts([0xff, 0xd8, 0xff]);
  if (mime === "image/webp") return starts([0x52, 0x49, 0x46, 0x46]);
  if (mime.includes("openxmlformats")) return starts([0x50, 0x4b, 0x03, 0x04]);
  if (mime === "application/msword" || mime === "application/vnd.ms-excel") return starts([0xd0, 0xcf, 0x11, 0xe0]);
  return false;
}

export async function uploadAttachmentAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await enforceRateLimit("upload", 60, 3600, ctx.user.id);
    const quoteId = z.string().uuid().parse(formData.get("quoteId"));
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("Aucun fichier.");
    if (file.size === 0) return fail("Fichier vide.");
    if (file.size > MAX_BYTES) return fail("Fichier trop volumineux (10 Mo maximum).");
    if (!ALLOWED.has(file.type)) return fail("Format non autorisé (PDF, images, Word, Excel).");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!magicMatches(file.type, bytes)) return fail("Le contenu du fichier ne correspond pas à son format.");
    const { data: quote } = await ctx.supabase.from("quotes").select("id, reference").eq("id", quoteId).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!quote) return fail("Devis introuvable.");
    const path = `${ctx.organization.id}/${quoteId}/${randomUUID()}-${safeName(file.name)}`;
    const { error: upErr } = await ctx.supabase.storage.from("quote-attachments").upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return fail("Envoi du fichier impossible.");
    const { error } = await ctx.supabase.from("quote_attachments").insert({
      organization_id: ctx.organization.id,
      quote_id: quoteId,
      storage_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: ctx.user.id,
    });
    if (error) await ctx.supabase.storage.from("quote-attachments").remove([path]);
    assertNoError(error, "Pièce jointe");
    await logActivity(ctx.supabase, { organizationId: ctx.organization.id, type: "attachment_added", message: `Document « ${file.name} » ajouté`, quoteId, actorId: ctx.user.id });
    revalidatePath(`/devis/${quoteId}`);
    return ok(undefined, "Document ajouté");
  });
}

export async function getAttachmentUrlAction(id: string): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const { data: att } = await ctx.supabase.from("quote_attachments").select("storage_path, file_name").eq("id", z.string().uuid().parse(id)).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!att) return fail("Document introuvable.");
    // URL signée de courte durée : le bucket est privé
    const { data, error } = await ctx.supabase.storage.from("quote-attachments").createSignedUrl(att.storage_path, 60, { download: att.file_name });
    if (error || !data) return fail("Lien de téléchargement indisponible.");
    return ok({ url: data.signedUrl });
  });
}

export async function deleteAttachmentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const { data: att } = await ctx.supabase.from("quote_attachments").select("id, storage_path, file_name, quote_id").eq("id", z.string().uuid().parse(id)).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!att) return fail("Document introuvable.");
    await ctx.supabase.storage.from("quote-attachments").remove([att.storage_path]);
    const { error } = await ctx.supabase.from("quote_attachments").delete().eq("id", att.id);
    assertNoError(error, "Suppression du document");
    await logActivity(ctx.supabase, { organizationId: ctx.organization.id, type: "attachment_removed", message: `Document « ${att.file_name} » supprimé`, quoteId: att.quote_id, actorId: ctx.user.id });
    revalidatePath(`/devis/${att.quote_id}`);
    return ok(undefined, "Document supprimé");
  });
}
