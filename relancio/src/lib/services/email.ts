import "server-only";
import { Resend } from "resend";
import { isEmailProviderConfigured, serverEnv } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  fromName: string;
  replyTo?: string | null;
  idempotencyKey: string;
}

export type SendResult = { ok: true; providerMessageId: string } | { ok: false; error: string; retryable: boolean };

let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(serverEnv.resendApiKey);
  return client;
}

/** Échappe un nom d'expéditeur pour l'en-tête From. */
function sanitizeName(name: string): string {
  return name.replace(/[<>"\r\n]/g, "").trim().slice(0, 80) || "Relancio";
}

/** Convertit le texte brut en HTML simple et sûr (paragraphes, retours à la ligne). */
export function textToHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#172433">${esc
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;
}

/**
 * Envoie un email via Resend. La clé d'idempotence garantit qu'un même message
 * n'est pas envoyé deux fois, même en cas de nouvelle tentative réseau.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  if (!isEmailProviderConfigured()) {
    return { ok: false, error: "Le fournisseur d'email n'est pas configuré.", retryable: false };
  }
  try {
    const { data, error } = await resend().emails.send(
      {
        from: `${sanitizeName(email.fromName)} <${serverEnv.resendFromEmail}>`,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: textToHtml(email.text),
        replyTo: email.replyTo ?? undefined,
      },
      { idempotencyKey: email.idempotencyKey },
    );
    if (error || !data) {
      const name = (error as { name?: string } | null)?.name ?? "";
      const retryable = /rate_limit|internal_server_error|application_error/.test(name);
      return { ok: false, error: error?.message ?? "Réponse vide du fournisseur", retryable };
    }
    return { ok: true, providerMessageId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau", retryable: true };
  }
}

export function verifyResendWebhook(payload: string, headers: { id: string; timestamp: string; signature: string }) {
  return resend().webhooks.verify({ payload, headers, webhookSecret: serverEnv.resendWebhookSecret });
}
