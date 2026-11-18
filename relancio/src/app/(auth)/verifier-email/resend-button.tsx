"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { resendVerificationAction } from "../actions";

export function ResendButton({ email }: { email: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await resendVerificationAction(email);
          if (res.ok) toast.success(res.message ?? "Email renvoyé");
          else toast.error(res.error);
        })
      }
    >
      {pending && <Spinner />}
      Renvoyer l&apos;email
    </Button>
  );
}
