"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/components/app/user-menu";
import { ROLE_LABELS, type Role } from "@/lib/domain/constants";
import { formatDate } from "@/lib/domain/dates";
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction, revokeInvitationAction } from "@/server/actions/settings";

export function MembersManager({
  members,
  invitations,
  currentUserId,
  currentRole,
  canManage,
  isDemo,
}: {
  members: { userId: string; name: string; email: string; role: Role; since: string }[];
  invitations: { id: string; email: string; role: Role; expires_at: string }[];
  currentUserId: string;
  currentRole: Role;
  canManage: boolean;
  isDemo: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [link, setLink] = useState<string | null>(null);
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
      <ul className="divide-y rounded-md border">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar className="size-8"><AvatarFallback className="bg-primary-soft text-xs text-primary">{initials(m.name || m.email)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name || m.email}{m.userId === currentUserId && <span className="font-normal text-muted-foreground"> (vous)</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{m.email} · depuis le {formatDate(m.since)}</p>
            </div>
            {canManage && m.userId !== currentUserId && (m.role !== "owner" || currentRole === "owner") ? (
              <>
                <Select value={m.role} onValueChange={(r) => run(() => changeMemberRoleAction(m.userId, r as Role))} disabled={pending}>
                  <SelectTrigger size="sm" className="w-40" aria-label={`Rôle de ${m.name || m.email}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(currentRole === "owner" ? (["owner", "admin", "member"] as Role[]) : (["admin", "member"] as Role[])).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Retirer" onClick={() => confirm(`Retirer ${m.name || m.email} de l'entreprise ?`) && run(() => removeMemberAction(m.userId))}>
                  <X />
                </Button>
              </>
            ) : (
              <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
            )}
          </li>
        ))}
      </ul>

      {canManage && !isDemo && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Inviter un collaborateur</p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await inviteMemberAction({ email, role });
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                setLink(r.data.emailed ? null : r.data.link);
                setEmail("");
                router.refresh();
              });
            }}
          >
            <Input type="email" placeholder="collegue@entreprise.fr" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:flex-1" required aria-label="Email du collaborateur" />
            <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
              <SelectTrigger className="sm:w-40" aria-label="Rôle"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={pending}><UserPlus /> Inviter</Button>
          </form>
          {link && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{link}</span>
              <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Lien copié"); }}><Copy /> Copier</Button>
            </div>
          )}
          {link && <p className="text-xs text-muted-foreground">L&apos;envoi d&apos;email n&apos;est pas configuré : transmettez ce lien vous-même. Il est valable 7 jours.</p>}
        </div>
      )}

      {invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Invitations en attente</p>
          <ul className="divide-y rounded-md border">
            {invitations.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.email}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[i.role]} · expire le {formatDate(i.expires_at)}</span>
                {canManage && <Button variant="ghost" size="sm" onClick={() => run(() => revokeInvitationAction(i.id))}>Révoquer</Button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
