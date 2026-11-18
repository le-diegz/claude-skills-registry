"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { changeEmailAction, changePasswordAction, updateNotificationPrefsAction, updateProfileAction } from "@/server/actions/settings";

function useRun() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Enregistré");
      after?.();
      router.refresh();
    });
  return { pending, run };
}

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const { pending, run } = useRun();
  return (
    <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => updateProfileAction({ full_name: name, phone: tel })); }}>
      <div className="space-y-1.5"><Label htmlFor="pf-name">Nom et prénom</Label><Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
      <div className="space-y-1.5"><Label htmlFor="pf-phone">Téléphone</Label><Input id="pf-phone" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending && <Spinner />} Enregistrer</Button></div>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [value, setValue] = useState(email);
  const { pending, run } = useRun();
  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); run(() => changeEmailAction(value)); }}>
      <div className="flex-1 space-y-1.5"><Label htmlFor="pf-email">Email de connexion</Label><Input id="pf-email" type="email" value={value} onChange={(e) => setValue(e.target.value)} /></div>
      <Button type="submit" variant="outline" disabled={pending || value === email}>Changer l&apos;email</Button>
    </form>
  );
}

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const { pending, run } = useRun();
  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); run(() => changePasswordAction(pw), () => setPw("")); }}>
      <div className="flex-1 space-y-1.5"><Label htmlFor="pf-pw">Nouveau mot de passe</Label><Input id="pf-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <Button type="submit" variant="outline" disabled={pending || pw.length < 10}>Modifier</Button>
    </form>
  );
}

export function NotificationPrefs({ initial }: { initial: { notify_followups: boolean; notify_imports: boolean; notify_failures: boolean } }) {
  const [prefs, setPrefs] = useState(initial);
  const { pending, run } = useRun();
  const toggle = (k: keyof typeof prefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    run(() => updateNotificationPrefsAction(next));
  };
  const rows: { k: keyof typeof prefs; label: string; desc: string }[] = [
    { k: "notify_followups", label: "Relances à valider", desc: "Une notification par jour lorsque des relances sont prêtes." },
    { k: "notify_imports", label: "Imports terminés", desc: "Résumé à la fin de chaque import CSV." },
    { k: "notify_failures", label: "Échecs d'envoi", desc: "Quand un email de relance n'a pas pu être envoyé." },
  ];
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium">{r.label}</p>
            <p className="text-sm text-muted-foreground">{r.desc}</p>
          </div>
          <Switch checked={prefs[r.k]} disabled={pending} onCheckedChange={(v) => toggle(r.k, v)} aria-label={r.label} />
        </div>
      ))}
      <p className="pt-3 text-xs text-muted-foreground">Les invitations et informations importantes du compte sont toujours notifiées. Notifications affichées dans l&apos;application.</p>
    </div>
  );
}
