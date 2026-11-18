import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité" };

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed sm:px-6">
      <h1 className="text-2xl font-semibold">Politique de confidentialité</h1>
      <p className="rounded-md bg-warning-soft p-3 text-[#7A4303]">Document de travail à faire valider par un conseil juridique avant mise en production. Les mentions entre crochets sont à compléter.</p>
      <h2 className="pt-2 text-lg font-semibold">Données traitées</h2>
      <p>Compte utilisateur : nom, email, téléphone (facultatif). Données saisies par l&apos;entreprise cliente : coordonnées de ses clients (nom, entreprise, email, téléphone, adresse), devis, montants, notes, historique des relances, documents joints.</p>
      <h2 className="pt-2 text-lg font-semibold">Rôles</h2>
      <p>Pour les données de ses clients, l&apos;entreprise utilisatrice est responsable de traitement ; [raison sociale de l&apos;éditeur] agit comme sous-traitant au sens de l&apos;article 28 du RGPD.</p>
      <h2 className="pt-2 text-lg font-semibold">Finalités et base légale</h2>
      <p>Fourniture du service de suivi et de relance des devis (exécution du contrat). Les relances adressées aux destinataires des devis relèvent de l&apos;intérêt légitime de l&apos;entreprise utilisatrice ; chaque destinataire peut s&apos;y opposer, ce qui suspend immédiatement les relances le concernant.</p>
      <h2 className="pt-2 text-lg font-semibold">Hébergement et sous-traitants</h2>
      <p>Base de données et fichiers : Supabase ([région d&apos;hébergement à préciser, UE recommandée]). Application : Vercel. Emails transactionnels (si activés) : Resend.</p>
      <h2 className="pt-2 text-lg font-semibold">Conservation</h2>
      <p>Les données sont conservées pendant la durée de l&apos;abonnement puis supprimées sur demande ou à la suppression du compte. Les sauvegardes du fournisseur d&apos;hébergement expirent selon sa politique de rétention [à préciser].</p>
      <h2 className="pt-2 text-lg font-semibold">Vos droits</h2>
      <p>Accès, rectification, effacement, portabilité (export intégré), opposition. Contact : [email du délégué / contact RGPD].</p>
    </article>
  );
}
