"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LOST_REASONS, LOST_REASON_LABELS, type LostReason } from "@/lib/domain/constants";

export function LostReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  count = 1,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: LostReason | null, details: string | null) => void;
  count?: number;
  pending?: boolean;
}) {
  const [reason, setReason] = useState<LostReason | "">("");
  const [details, setDetails] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{count > 1 ? `Marquer ${count} devis comme refusés` : "Marquer le devis comme refusé"}</DialogTitle>
          <DialogDescription>Les relances programmées seront annulées. Le motif alimente vos statistiques.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as LostReason)} className="grid grid-cols-2 gap-2">
          {LOST_REASONS.map((r) => (
            <Label key={r} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
              <RadioGroupItem value={r} /> {LOST_REASON_LABELS[r]}
            </Label>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="lost-details">Précisions (facultatif)</Label>
          <Textarea id="lost-details" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="destructive" disabled={pending} onClick={() => onConfirm(reason || null, details.trim() || null)}>
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
