"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addQuoteNoteAction } from "@/server/actions/quotes";

export function NoteForm({ quoteId }: { quoteId: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addQuoteNoteAction(quoteId, note);
          if (!res.ok) return void toast.error(res.error);
          setNote("");
          router.refresh();
        });
      }}
    >
      <Textarea
        rows={2}
        value={note}
        placeholder="Ajouter une note (appel, rendez-vous, remarque…)"
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={pending || !note.trim()}>Ajouter la note</Button>
      </div>
    </form>
  );
}
