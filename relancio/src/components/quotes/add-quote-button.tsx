"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuoteDialog } from "./quote-dialog-provider";

export function AddQuoteButton({
  variant = "default",
  className,
  label = "Ajouter un devis",
  customerId,
}: {
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
  customerId?: string;
}) {
  const { openCreate } = useQuoteDialog();
  return (
    <Button variant={variant} className={className} onClick={() => openCreate(customerId ? { customer_id: customerId } : undefined)}>
      <Plus /> {label}
    </Button>
  );
}
