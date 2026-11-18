"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { requestPasswordResetAction } from "../actions";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">Recevez un lien pour choisir un nouveau mot de passe.</p>
      </div>
      {message ? (
        <Alert>
          <CheckCircle2 className="text-success" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(undefined);
            start(async () => {
              const res = await requestPasswordResetAction(email);
              if (res.ok) setMessage(res.message);
              else setError(res.error);
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Spinner />}
            Envoyer le lien
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/connexion" className="text-primary hover:underline">Retour à la connexion</Link>
      </p>
    </div>
  );
}
