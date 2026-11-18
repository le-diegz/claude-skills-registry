"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive"><AlertTriangle className="size-6" /></span>
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="text-sm text-muted-foreground">Le chargement de cette page a échoué. Vos données ne sont pas perdues.{error.digest ? ` (réf. ${error.digest})` : ""}</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
