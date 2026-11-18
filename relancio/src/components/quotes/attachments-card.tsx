"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { deleteAttachmentAction, getAttachmentUrlAction, uploadAttachmentAction } from "@/server/actions/attachments";
import { formatDate } from "@/lib/domain/dates";

export function AttachmentsCard({ quoteId, items }: { quoteId: string; items: { id: string; file_name: string; size_bytes: number; created_at: string }[] }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  const upload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) return void toast.error("Fichier trop volumineux (10 Mo maximum).");
    const fd = new FormData();
    fd.set("quoteId", quoteId);
    fd.set("file", file);
    start(async () => {
      const res = await uploadAttachmentAction(fd);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Document ajouté");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun document. Ajoutez le PDF du devis, des photos du chantier…</p>
      ) : (
        <ul className="space-y-1">
          {items.map((a) => (
            <li key={a.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">{(a.size_bytes / 1024 / 1024).toFixed(1)} Mo · {formatDate(a.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Télécharger ${a.file_name}`}
                onClick={() =>
                  start(async () => {
                    const res = await getAttachmentUrlAction(a.id);
                    if (res.ok) window.open(res.data.url, "_blank", "noopener");
                    else toast.error(res.error);
                  })
                }
              >
                <Download />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                aria-label={`Supprimer ${a.file_name}`}
                onClick={() =>
                  start(async () => {
                    const res = await deleteAttachmentAction(a.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success("Document supprimé");
                    router.refresh();
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? <Spinner /> : <Paperclip />} Ajouter un document
      </Button>
      <p className="text-xs text-muted-foreground">PDF, images, Word ou Excel · 10 Mo max. Accès par lien sécurisé temporaire.</p>
    </div>
  );
}
