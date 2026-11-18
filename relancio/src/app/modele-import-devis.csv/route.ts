import { buildCsvTemplate } from "@/lib/domain/csv-import";

export function GET() {
  return new Response(buildCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modele-import-devis-relancio.csv"',
    },
  });
}
