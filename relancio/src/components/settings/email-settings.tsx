"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { saveEmailSettingsAction, sendSenderVerificationAction, sendTestEmailAction } from "@/server/actions/settings";

export function EmailSettings({
  providerConfigured,
  fromAddress,
  initial,
  verifiedAt,
  editable,
}: {
  providerConfigured: boolean;
  fromAddress: string;
  initial: { enabled: boolean; from_name: string; reply_to_email: string };
  verifiedAt: string | null;
  editable: boolean;
}) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Fait");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className={`flex gap-3 rounded-md border p-4 text-sm ${providerConfigured ? "border-success/30 bg-success-soft/50" : "bg-muted/50"}`}>
        {providerConfigured ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        <div>
          <p className="font-medium">{providerConfigured ? "Fournisseur d'email connecté (Resend)" : "Envoi direct non configuré : mode manuel actif"}</p>
          <p className="text-muted-foreground">
            {providerConfigured
              ? `Les relances validées partent de ${fromAddress} avec le nom de votre entreprise. Les réponses arrivent sur votre adresse de réponse vérifiée.`
              : "Vous copiez chaque message validé dans votre messagerie, puis vous l'enregistrez comme envoyé. L'administrateur de la plateforme doit renseigner RESEND_API_KEY et RESEND_FROM_EMAIL pour activer l'envoi direct."}
          </p>
        </div>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveEmailSettingsAction(v));
        }}
      >
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <Label htmlFor="em-enabled">Envoyer les relances validées par email</Label>
            <p className="text-sm text-muted-foreground">Une relance n&apos;est jamais envoyée sans votre validation explicite.</p>
          </div>
          <Switch id="em-enabled" checked={v.enabled} disabled={!editable || !providerConfigured} onCheckedChange={(enabled) => setV({ ...v, enabled })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="em-name">Nom de l&apos;expéditeur</Label><Input id="em-name" value={v.from_name} disabled={!editable} onChange={(e) => setV({ ...v, from_name: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="em-reply">Adresse de réponse</Label>
            <Input id="em-reply" type="email" value={v.reply_to_email} disabled={!editable} onChange={(e) => setV({ ...v, reply_to_email: e.target.value })} />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {verifiedAt ? <><ShieldCheck className="size-3.5 text-success" /> Vérifiée</> : "Non vérifiée : les réponses iront à l'adresse d'expédition"}
            </p>
          </div>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>{pending && <Spinner />} Enregistrer</Button>
            {providerConfigured && !verifiedAt && initial.reply_to_email && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => run(sendSenderVerificationAction)}>Vérifier l&apos;adresse de réponse</Button>
            )}
            {providerConfigured && <Button type="button" variant="outline" disabled={pending} onClick={() => run(sendTestEmailAction)}><Send /> Envoyer un email de test</Button>}
          </div>
        )}
      </form>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Statuts suivis : envoyé, délivré, rebond, plainte — mis à jour par les webhooks Resend lorsqu&apos;ils sont configurés.</p>
        <p>Les réponses de vos clients ne sont pas lues par Relancio : enregistrez-les avec « Le client a répondu ».</p>
      </div>
    </div>
  );
}
