import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { ResendButton } from "./resend-button";
import { getSession } from "@/lib/auth/context";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Vérifiez votre email" };

export default async function Page({ searchParams }: PageProps<"/verifier-email">) {
  const sp = await searchParams;
  const session = await getSession();
  if (session.user?.emailConfirmed) redirect("/onboarding");
  const email = typeof sp.email === "string" ? sp.email : (session.user?.email ?? "");
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <MailCheck className="size-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Vérifiez votre boîte email</h1>
        <p className="text-sm text-muted-foreground">
          Nous avons envoyé un lien de confirmation{email ? <> à <span className="font-medium text-foreground">{email}</span></> : null}.
          Cliquez dessus pour activer votre compte.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">Pensez à vérifier vos courriers indésirables.</p>
      {email && <ResendButton email={email} />}
    </div>
  );
}
