import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyResendWebhook } from "@/lib/services/email";
import { serverEnv } from "@/lib/env";

const STATUS: Record<string, "delivered" | "bounced" | "complained" | "delayed" | "failed" | "sent" | "opened" | "clicked"> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

/** Webhook Resend (signature Svix vérifiée) : met à jour le statut de délivrance confirmé. */
export async function POST(request: NextRequest) {
  if (!serverEnv.resendWebhookSecret || !serverEnv.resendApiKey) return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
  const payload = await request.text();
  const headers = {
    id: request.headers.get("svix-id") ?? "",
    timestamp: request.headers.get("svix-timestamp") ?? "",
    signature: request.headers.get("svix-signature") ?? "",
  };
  let event: { type: string; data: { email_id?: string } };
  try {
    event = verifyResendWebhook(payload, headers) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }
  const status = STATUS[event.type];
  const messageId = event.data?.email_id;
  if (!status || !messageId) return NextResponse.json({ ok: true, ignored: true });

  const admin = createAdminClient();
  const { data: comm } = await admin.from("communication_events").select("id, organization_id, quote_id, delivery_status").eq("provider_message_id", messageId).maybeSingle();
  if (!comm) return NextResponse.json({ ok: true, unknown: true });
  // Ne régresse pas un statut définitif (ex. « delivered » après « bounced »)
  const final = ["bounced", "complained", "failed"];
  if (!(comm.delivery_status && final.includes(comm.delivery_status) && !final.includes(status))) {
    await admin.from("communication_events").update({ delivery_status: status }).eq("id", comm.id);
  }
  if (status === "bounced" || status === "failed" || status === "complained") {
    await admin.from("activity_events").insert({
      organization_id: comm.organization_id,
      quote_id: comm.quote_id,
      type: "followup_failed",
      message: status === "complained" ? "Le destinataire a signalé la relance comme indésirable" : "La relance n'a pas pu être délivrée (adresse en erreur)",
    });
    const { data: members } = await admin.from("organization_members").select("user_id").eq("organization_id", comm.organization_id);
    await admin.from("notifications").upsert(
      (members ?? []).map((m) => ({
        organization_id: comm.organization_id,
        user_id: m.user_id,
        type: "send_failed",
        title: status === "complained" ? "Relance signalée comme indésirable" : "Relance non délivrée",
        body: "Vérifiez l'adresse email du client.",
        link: comm.quote_id ? `/devis/${comm.quote_id}` : "/relances",
        dedupe_key: `webhook:${messageId}:${status}`,
      })),
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    );
  }
  return NextResponse.json({ ok: true });
}
