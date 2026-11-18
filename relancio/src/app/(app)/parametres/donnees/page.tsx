import type { Metadata } from "next";
import { Download, FileJson } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/section";
import { DangerZone } from "@/components/settings/danger-zone";

export const metadata: Metadata = { title: "Données et confidentialité" };

export default async function Page() {
  const ctx = await requireAppContext();
  const canExport = can(ctx.role, "data.export");
  return (
    <>
      <SettingsSection title="Export des données" description="Récupérez vos données à tout moment (portabilité).">
        {canExport ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><a href="/api/export/devis"><Download /> Devis (CSV, Excel)</a></Button>
            <Button variant="outline" asChild><a href="/api/export/donnees"><FileJson /> Export complet (JSON)</a></Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Les exports sont réservés aux administrateurs.</p>
        )}
      </SettingsSection>
      <SettingsSection title="Confidentialité">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Relancio ne collecte que les données nécessaires au suivi commercial : coordonnées des clients (nom, email, téléphone, adresse) et informations des devis.
            Vous en restez responsable de traitement ; Relancio agit comme sous-traitant.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Isolation stricte des données par entreprise (Row Level Security PostgreSQL).</li>
            <li>Documents stockés dans un espace privé, accessibles uniquement par lien temporaire signé.</li>
            <li>Opposition au contact : un client marqué « ne plus recontacter » n&apos;est plus relancé.</li>
            <li>Journal d&apos;audit des opérations sensibles (exports, suppressions, rôles).</li>
            <li>Suppression complète possible ci-dessous ; les sauvegardes du fournisseur expirent selon sa politique de rétention.</li>
          </ul>
          <p>Base légale suggérée pour la relance de devis : intérêt légitime (suivi d&apos;une demande du client). Ce produit n&apos;a pas fait l&apos;objet d&apos;un audit de conformité RGPD.</p>
        </div>
      </SettingsSection>
      {!ctx.organization.is_demo && (
        <SettingsSection title="Suppression">
          <DangerZone orgName={ctx.organization.name} email={ctx.user.email} isOwner={ctx.role === "owner"} />
        </SettingsSection>
      )}
    </>
  );
}
