"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { TEMPLATE_KIND_LABELS, type TemplateKind } from "@/lib/domain/constants";
import { SAMPLE_VALUES, TEMPLATE_VARIABLES, renderTemplate, unknownVariables } from "@/lib/domain/templates";
import { deleteTemplateAction, saveTemplateAction } from "@/server/actions/settings";

interface T { id: string; kind: TemplateKind; name: string; subject: string; body: string; is_active: boolean }

export function TemplatesEditor({ templates, companyName, editable }: { templates: T[]; companyName: string; editable: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
  const [draft, setDraft] = useState<T | null>(templates[0] ?? null);
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const sample = useMemo(() => ({ ...SAMPLE_VALUES, company_name: companyName }), [companyName]);
  const unknown = draft ? unknownVariables(draft.subject + draft.body) : [];

  const select = (t: T) => { setSelectedId(t.id); setDraft(t); setPreview(false); };
  const newCustom = () => {
    setSelectedId(null);
    setDraft({ id: "", kind: "custom", name: "Nouveau modèle", subject: "Votre devis {quote_reference}", body: "Bonjour {client_name},\n\n\n\nBien cordialement,\n{company_name}", is_active: true });
  };
  const insertVar = (key: string) => {
    if (!draft) return;
    const el = bodyRef.current;
    const pos = el?.selectionStart ?? draft.body.length;
    const body = draft.body.slice(0, pos) + `{${key}}` + draft.body.slice(el?.selectionEnd ?? pos);
    setDraft({ ...draft, body });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + key.length + 2, pos + key.length + 2); });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
      <div className="space-y-1">
        {templates.map((t) => (
          <button key={t.id} type="button" onClick={() => select(t)} className={cn("w-full rounded-md px-3 py-2 text-left text-sm transition-colors", selectedId === t.id ? "bg-primary-soft text-accent-foreground" : "hover:bg-muted")}>
            <span className="block truncate font-medium">{t.name}</span>
            <span className="block text-xs text-muted-foreground">{TEMPLATE_KIND_LABELS[t.kind]}{!t.is_active && " · inactif"}</span>
          </button>
        ))}
        {editable && <Button variant="ghost" size="sm" className="w-full justify-start" onClick={newCustom}><Plus /> Nouveau modèle</Button>}
      </div>
      {draft && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary">{TEMPLATE_KIND_LABELS[draft.kind]}</Badge>
            <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}><Eye /> {preview ? "Modifier" : "Prévisualiser"}</Button>
          </div>
          {preview ? (
            <div className="space-y-3 rounded-md border bg-background p-4">
              <p className="text-xs text-muted-foreground">Aperçu avec des valeurs d&apos;exemple</p>
              <p className="font-medium">{renderTemplate(draft.subject, sample)}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{renderTemplate(draft.body, sample)}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5"><Label htmlFor="tpl-name">Nom</Label><Input id="tpl-name" value={draft.name} disabled={!editable} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="tpl-subject">Objet</Label><Input id="tpl-subject" value={draft.subject} disabled={!editable} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">Message</Label>
                <Textarea id="tpl-body" ref={bodyRef} rows={12} value={draft.body} disabled={!editable} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="leading-relaxed" />
                {unknown.length > 0 && <p className="text-xs text-destructive">Variable inconnue : {unknown.map((u) => `{${u}}`).join(", ")}</p>}
              </div>
              {editable && (
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button key={v.key} type="button" onClick={() => insertVar(v.key)} className="rounded border bg-muted/50 px-2 py-0.5 font-mono text-xs hover:bg-muted" title={v.label}>
                      {`{${v.key}}`}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch id="tpl-active" checked={draft.is_active} disabled={!editable} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            <Label htmlFor="tpl-active" className="font-normal">Actif</Label>
          </div>
          <p className="text-xs text-muted-foreground">Restez factuel : n&apos;annoncez ni promotion, ni urgence, ni disponibilité que vous ne pouvez pas garantir.</p>
          {editable && (
            <div className="flex gap-2">
              <Button
                disabled={pending || unknown.length > 0}
                onClick={() =>
                  start(async () => {
                    const r = await saveTemplateAction(draft.id || null, { name: draft.name, subject: draft.subject, body: draft.body, is_active: draft.is_active }, draft.kind);
                    if (!r.ok) return void toast.error(r.error);
                    toast.success(r.message);
                    setSelectedId(r.data.id);
                    setDraft({ ...draft, id: r.data.id });
                    router.refresh();
                  })
                }
              >
                {pending && <Spinner />} Enregistrer
              </Button>
              {draft.kind === "custom" && draft.id && (
                <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => start(async () => { const r = await deleteTemplateAction(draft.id); if (!r.ok) return void toast.error(r.error); toast.success("Modèle supprimé"); setDraft(null); router.refresh(); })}>
                  <Trash2 /> Supprimer
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
