import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, type Role } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Invitation" };

async function accept(token: string) {
  "use server";
  const s = await getSession();
  if (!s.user) redirect(`/connexion?next=/invitation/${token}`);
  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: inv } = await admin.from("organization_invitations").select("*").eq("token_hash", hash).maybeSingle();
  if (!inv || inv.accepted_at || inv.revoked_at || new Date(inv.expires_at) < new Date()) redirect(`/invitation/${token}?erreur=1`);
  if (inv.email.toLowerCase() !== s.user.email.toLowerCase()) redirect(`/invitation/${token}?erreur=email`);
  await admin.from("organization_members").upsert({ organization_id: inv.organization_id, user_id: s.user.id, role: inv.role }, { onConflict: "organization_id,user_id", ignoreDuplicates: true });
  await admin.from("organization_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
  await admin.from("profiles").update({ current_organization_id: inv.organization_id }).eq("id", s.user.id);
  await admin.from("audit_logs").insert({ organization_id: inv.organization_id, actor_id: s.user.id, action: "invitation.accepted", target_type: "invitation", target_id: inv.id });
  if (inv.invited_by) {
    await admin.from("notifications").insert({
      organization_id: inv.organization_id,
      user_id: inv.invited_by,
      type: "invitation",
      title: "Invitation acceptée",
      body: `${s.user.email} a rejoint l'équipe.`,
      link: "/parametres/membres",
    });
  }
  redirect("/tableau-de-bord");
}

export default async function InvitationPage({ params, searchParams }: PageProps<"/invitation/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: inv } = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await admin.from("organization_invitations").select("email, role, expires_at, accepted_at, revoked_at, organization:organizations(name)").eq("token_hash", hash).maybeSingle()
    : { data: null };
  const s = await getSession();
  const valid = inv && !inv.accepted_at && !inv.revoked_at && new Date(inv.expires_at) > new Date();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4">
      <Logo />
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Users className="size-6" /></span>
        {!valid ? (
          <>
            <h1 className="text-xl font-semibold">Invitation invalide ou expirée</h1>
            <p className="text-sm text-muted-foreground">Demandez à votre collègue de vous renvoyer une invitation.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Rejoindre {inv.organization?.name}</h1>
            <p className="text-sm text-muted-foreground">
              Invitation pour <span className="font-medium text-foreground">{inv.email}</span> · rôle {ROLE_LABELS[inv.role as Role].toLowerCase()}
            </p>
            {sp.erreur === "email" && <p className="text-sm text-destructive">Connectez-vous avec l&apos;adresse invitée ({inv.email}).</p>}
            {!s.user ? (
              <div className="flex flex-col gap-2">
                <Button asChild><Link href={`/inscription?next=/invitation/${token}`}>Créer mon compte</Link></Button>
                <Button variant="outline" asChild><Link href={`/connexion?next=/invitation/${token}`}>J&apos;ai déjà un compte</Link></Button>
              </div>
            ) : (
              <form action={accept.bind(null, token)}>
                <Button type="submit" className="w-full">Accepter l&apos;invitation</Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
