import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { ImportWizard } from "@/components/import/import-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/domain/dates";

export const metadata: Metadata = { title: "Importer des devis" };

export default async function ImportPage() {
  const ctx = await requireAppContext();
  const { data: jobs } = await ctx.supabase
    .from("import_jobs")
    .select("id, file_name, status, total_rows, imported_rows, skipped_rows, error_rows, created_at")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(5);
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/devis" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Devis</Link>
      <PageHeader
        title="Importer des devis"
        description="Depuis l'export CSV de votre logiciel de devis ou d'un tableur. Relancio ne se connecte pas directement à votre logiciel : l'import se fait par fichier."
      />
      <ImportWizard />
      {(jobs ?? []).length > 0 && (
        <Card className="mt-8">
          <CardHeader><CardTitle className="text-base">Imports précédents</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {(jobs ?? []).map((j) => (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-medium">{j.file_name}</span>
                  <span className="text-muted-foreground">
                    {formatDateTime(j.created_at)} · {j.imported_rows} importés · {j.skipped_rows} doublons · {j.error_rows} erreurs
                    {j.status !== "completed" && " · interrompu"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
