"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updatePasswordAction } from "../actions";

export function ResetForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground">10 caractères minimum, avec lettres et chiffres.</p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
          }
          setError(undefined);
          start(async () => {
            const res = await updatePasswordAction(password);
            if (res && !res.ok) setError(res.error);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmation</Label>
          <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          Enregistrer
        </Button>
      </form>
    </div>
  );
}
