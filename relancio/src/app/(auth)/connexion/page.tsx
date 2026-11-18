import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function Page({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = sp.erreur === "lien-invalide" ? "Ce lien est invalide ou a expiré. Demandez-en un nouveau." : undefined;
  return <SignInForm next={next} linkError={error} />;
}
