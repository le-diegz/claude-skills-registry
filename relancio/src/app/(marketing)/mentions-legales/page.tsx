import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed sm:px-6">
      <h1 className="text-2xl font-semibold">Mentions légales</h1>
      <p className="rounded-md bg-warning-soft p-3 text-[#7A4303]">À compléter avec les informations de l&apos;éditeur avant toute commercialisation.</p>
      <p>Éditeur : [raison sociale], [forme juridique], capital [montant], RCS [ville et numéro], siège [adresse]. Directeur de la publication : [nom].</p>
      <p>Hébergement : Vercel Inc. (application) et Supabase Inc. (données) — [coordonnées à préciser].</p>
      <p>Contact : [email].</p>
    </article>
  );
}
