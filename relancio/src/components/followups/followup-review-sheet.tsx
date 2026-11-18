"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquareReply,
  MoreHorizontal,
  PauseCircle,
  Phone,
  Send,
  ShieldCheck,
  SkipForward,
  TriangleAlert,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { JobStatusBadge, QuoteStatusBadge } from "@/components/app/status-badge";
import { formatCents } from "@/lib/domain/money";
import { addDaysToDateOnly, formatDate, formatDateTime, todayParis } from "@/lib/domain/dates";
import { renderTemplate, unknownVariables } from "@/lib/domain/templates";
import { formatPhone } from "@/lib/domain/contact";
import {
  approveFollowupAction,
  markFollowupSentAction,
  saveFollowupDraftAction,
  sendFollowupAction,
  skipFollowupsAction,
  snoozeFollowupsAction,
} from "@/server/actions/followups";
import { recordReplyAction, setFollowupsPausedAction } from "@/server/actions/quotes";
import type { FollowupItem, TemplateOption } from "./types";

export function FollowupReviewSheet({
  item,
  open,
  onOpenChange,
  templates,
  emailEnabled,
  isDemo,
}: {
  item: FollowupItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateOption[];
  emailEnabled: boolean;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(item?.subject ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [recipient, setRecipient] = useState(item?.recipient_email ?? item?.customer.email ?? "");
  const [dirty, setDirty] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(addDaysToDateOnly(todayParis(), 3));
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (!item) return null;
  const approved = item.status === "approved" && !dirty;
  const isScheduled = item.status === "scheduled";
  const active = ["pending_approval", "to_prepare", "approved", "failed", "scheduled"].includes(item.status);
  const warnings = [...unknownVariables(subject + body).map((v) => `Variable inconnue : {${v}}`)];

  const run = (key: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, close = false) => {
    setBusy(key);
    start(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur");
        return;
      }
      toast.success(res.message ?? "Enregistré");
      setDirty(false);
      if (close) onOpenChange(false);
      router.refresh();
    });
  };

  const content = { subject, body, recipient_email: recipient };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast.success("Message copié", { description: "Une fois envoyé depuis votre messagerie, cliquez sur « Marquer comme envoyé »." });
    } catch {
      toast.error("Copie impossible : sélectionnez le texte manuellement.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <JobStatusBadge status={item.status} />
            <span className="text-xs text-muted-foreground">Relance n°{item.sequence}</span>
          </div>
          <SheetTitle className="text-lg">
            {item.customer.name}
            {item.customer.company_name && <span className="font-normal text-muted-foreground"> · {item.customer.company_name}</span>}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link href={`/devis/${item.quote.id}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
                {item.quote.reference} <ExternalLink className="size-3" />
              </Link>
              <span>{formatCents(item.quote.amount_ht_cents)} HT</span>
              <QuoteStatusBadge status={item.quote.status} />
              <span>Envoyé le {formatDate(item.quote.sent_at)}</span>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {item.status === "failed" && item.last_error && (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Échec du dernier envoi</p>
                <p className="opacity-90">{item.last_error}</p>
              </div>
            </div>
          )}
          {item.status === "to_prepare" && (
            <div className="flex gap-2 rounded-md border bg-muted/50 p-3 text-sm">
              <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p>
                Ce client n&apos;a pas d&apos;email. Appelez-le{item.customer.phone ? <> au <a className="font-medium text-primary" href={`tel:${item.customer.phone}`}>{formatPhone(item.customer.phone)}</a></> : null}{" "}
                puis enregistrez l&apos;appel, ou ajoutez une adresse ci-dessous.
              </p>
            </div>
          )}

          {isScheduled ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Relance programmée le {formatDateTime(item.scheduled_for)}</p>
              <p className="mt-1 text-muted-foreground">Le message sera généré depuis votre modèle à cette date, puis soumis à votre validation. Vous pouvez la reporter ou l&apos;ignorer dès maintenant.</p>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
            <div className="space-y-1.5">
              <Label htmlFor="fu-recipient">Destinataire</Label>
              <Input
                id="fu-recipient"
                type="email"
                value={recipient}
                placeholder="email du client"
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modèle</Label>
              <Select
                onValueChange={(id) => {
                  const t = templates.find((x) => x.id === id);
                  if (!t) return;
                  setSubject(renderTemplate(t.subject, item.templateValues));
                  setBody(renderTemplate(t.body, item.templateValues));
                  setDirty(true);
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Changer de modèle" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-subject">Objet</Label>
            <Input id="fu-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-body">Message</Label>
            <Textarea id="fu-body" value={body} rows={12} className="min-h-[240px] font-[inherit] leading-relaxed" onChange={(e) => { setBody(e.target.value); setDirty(true); }} />
            {warnings.length > 0 && <p className="text-xs text-destructive">{warnings.join(" · ")}</p>}
            {!item.templateValues.expiration_date && /jusqu.au\s*\./.test(body) && (
              <p className="text-xs text-muted-foreground">Ce devis n&apos;a pas de date d&apos;expiration : évitez les modèles qui la mentionnent.</p>
            )}
          </div>

            </>
          )}

          <div className="flex items-start gap-2 rounded-md bg-primary-soft/60 p-3 text-xs text-accent-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              Aucune relance n&apos;est envoyée sans votre validation. Copier le message ne l&apos;enregistre pas comme envoyé.
              {item.approved_at && !dirty && <> Validée le {formatDateTime(item.approved_at)}.</>}
            </p>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 border-t bg-card px-5 py-4 sm:flex-col">
          {active && (
            <>
              <div className="flex flex-wrap gap-2">
                {!isScheduled && (
                  <Button variant="outline" onClick={copy} className="flex-1 sm:flex-none">
                    <Copy /> Copier
                  </Button>
                )}
                {recipient && !isScheduled && (
                  <Button variant="outline" asChild className="flex-1 sm:flex-none">
                    <a href={`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
                      <Mail /> Ouvrir ma messagerie
                    </a>
                  </Button>
                )}
                {dirty && (
                  <Button variant="ghost" disabled={pending} onClick={() => run("save", () => saveFollowupDraftAction(item.id, content))}>
                    {busy === "save" && <Spinner />} Enregistrer le brouillon
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {isScheduled ? null : !approved ? (
                  <Button className="flex-1" disabled={pending} onClick={() => run("approve", () => approveFollowupAction(item.id, content))} data-testid="approve-followup">
                    {busy === "approve" ? <Spinner /> : <Check />} Valider le message
                  </Button>
                ) : emailEnabled && !isDemo && recipient ? (
                  <Button className="flex-1" disabled={pending} onClick={() => run("send", () => sendFollowupAction(item.id), true)}>
                    {busy === "send" ? <Spinner /> : <Send />} Envoyer par email
                  </Button>
                ) : null}
                <Button
                  variant={approved && !(emailEnabled && !isDemo) ? "default" : "secondary"}
                  className="flex-1"
                  disabled={pending}
                  onClick={() => run("mark", () => markFollowupSentAction(item.id, { channel: "manual", subject, body }), true)}
                  data-testid="mark-sent"
                >
                  {busy === "mark" ? <Spinner /> : <Check />} Marquer comme envoyé
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Plus d'actions"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem onSelect={() => run("phone", () => markFollowupSentAction(item.id, { channel: "phone" }), true)}>
                      <Phone /> Relance faite par téléphone
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => run("reply", () => recordReplyAction({ quoteId: item.quote.id, channel: "other" }), true)}>
                      <MessageSquareReply /> Le client a répondu
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => run("skip", () => skipFollowupsAction([item.id]), true)}>
                      <SkipForward /> Ignorer cette relance
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => run("pause", () => setFollowupsPausedAction([item.quote.id], true), true)}>
                      <PauseCircle /> Suspendre les relances du devis
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
                    <CalendarClock /> Reporter
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 space-y-3">
                  <Label htmlFor="snooze">Reporter au</Label>
                  <Input id="snooze" type="date" min={addDaysToDateOnly(todayParis(), 1)} value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)} />
                  <div className="flex gap-1.5">
                    {[1, 3, 7].map((d) => (
                      <Button key={d} variant="outline" size="sm" onClick={() => setSnoozeDate(addDaysToDateOnly(todayParis(), d))}>
                        +{d} j
                      </Button>
                    ))}
                  </div>
                  <Button className="w-full" size="sm" disabled={pending} onClick={() => run("snooze", () => snoozeFollowupsAction([item.id], snoozeDate), true)}>
                    Reporter
                  </Button>
                </PopoverContent>
              </Popover>
              {!emailEnabled && !isDemo && (
                <p className="text-xs text-muted-foreground">
                  Envoi direct non configuré — <Link href="/parametres/email" className="text-primary hover:underline">configurer l&apos;email</Link>.
                </p>
              )}
            </>
          )}
          {!active && <p className="text-sm text-muted-foreground">Cette relance est clôturée{item.sent_at ? ` (envoyée le ${formatDateTime(item.sent_at)})` : ""}.</p>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
