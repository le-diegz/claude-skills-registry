"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Download, FileSpreadsheet, FileUp, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  IMPORT_FIELDS,
  csvEscape,
  decodeCsv,
  detectDelimiter,
  guessMapping,
  missingRequiredFields,
  parseCsv,
  summarizeValidation,
  validateImportRows,
  type ColumnMapping,
  type CsvDelimiter,
  type CsvEncoding,
  type ImportField,
  type ParsedCsv,
  type ValidatedImportRow,
} from "@/lib/domain/csv-import";
import { formatCents } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { QUOTE_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/domain/constants";
import { getExistingReferencesAction, importQuotesBatchAction } from "@/server/actions/import";

const MAX_FILE = 5 * 1024 * 1024;
const BATCH = 200;
const DELIMS: { value: CsvDelimiter; label: string }[] = [
  { value: ";", label: "Point-virgule ( ; )" },
  { value: ",", label: "Virgule ( , )" },
  { value: "\t", label: "Tabulation" },
  { value: "|", label: "Barre verticale ( | )" },
];

type Step = "upload" | "mapping" | "validation" | "importing" | "done";

interface Report {
  imported: number;
  skipped: number;
  errors: number;
  createdCustomers: number;
  rowErrors: { rowNumber: number; message: string }[];
  dueNow: number;
}

export function ImportWizard({ onDone, compact = false }: { onDone?: (r: Report) => void; compact?: boolean }) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [encoding, setEncoding] = useState<CsvEncoding>("utf-8");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(";");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [existing, setExisting] = useState<string[]>([]);
  const [rows, setRows] = useState<ValidatedImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = async (file: File) => {
    if (file.size > MAX_FILE) return void toast.error("Fichier trop volumineux (5 Mo maximum).");
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) return void toast.error("Format attendu : fichier .csv (export Excel « CSV »).");
    const buf = await file.arrayBuffer();
    const decoded = decodeCsv(buf);
    const delim = detectDelimiter(decoded.text);
    const p = parseCsv(decoded.text, delim);
    if (p.headers.length < 2 || p.rows.length === 0) return void toast.error("Le fichier ne contient pas de lignes exploitables.");
    if (p.rows.length > 5000) return void toast.error("5 000 lignes maximum par import. Découpez le fichier.");
    setFileName(file.name);
    setBuffer(buf);
    setEncoding(decoded.encoding);
    setDelimiter(delim);
    setParsed(p);
    setMapping(guessMapping(p.headers));
    setStep("mapping");
    const res = await getExistingReferencesAction();
    if (res.ok) setExisting(res.data);
  };

  const reparse = (enc: CsvEncoding, delim: CsvDelimiter) => {
    if (!buffer) return;
    const text = enc === "utf-8" ? new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "") : new TextDecoder("windows-1252").decode(buffer);
    const p = parseCsv(text, delim);
    setEncoding(enc);
    setDelimiter(delim);
    setParsed(p);
    setMapping(guessMapping(p.headers));
  };

  const missing = useMemo(() => missingRequiredFields(mapping), [mapping]);
  const summary = useMemo(() => summarizeValidation(rows), [rows]);

  const validate = () => {
    if (!parsed) return;
    setRows(validateImportRows(parsed, mapping, { existingReferences: existing }));
    setStep("validation");
  };

  const runImport = async () => {
    const payload = rows.filter((r) => !r.duplicate || r.duplicate === "existing");
    // Doublons internes au fichier : seule la première occurrence est importée
    const toSend = payload.map((r) => ({
      rowNumber: r.rowNumber,
      raw: Object.fromEntries(Object.entries(r.raw).map(([k, v]) => [k.slice(0, 100), String(v).slice(0, 2000)])),
      data: r.duplicate === "existing" ? r.data : r.data,
      errors: r.errors,
    }));
    const fileDuplicates = rows.filter((r) => r.duplicate === "file").length;
    setStep("importing");
    setProgress(0);
    let jobId: string | null = null;
    const acc: Report = { imported: 0, skipped: fileDuplicates, errors: 0, createdCustomers: 0, rowErrors: [], dueNow: 0 };
    for (let i = 0; i < Math.max(1, toSend.length); i += BATCH) {
      const chunk = toSend.slice(i, i + BATCH);
      const final = i + BATCH >= toSend.length;
      const res = await importQuotesBatchAction({
        jobId,
        fileName,
        delimiter,
        encoding,
        mapping: mapping as Record<string, number>,
        total: rows.length,
        rows: chunk,
        final,
      });
      if (!res.ok) {
        toast.error(res.error);
        setStep("validation");
        return;
      }
      jobId = res.data.jobId;
      acc.imported += res.data.imported;
      acc.skipped += res.data.skipped;
      acc.errors += res.data.errors;
      acc.createdCustomers += res.data.createdCustomers;
      acc.rowErrors.push(...res.data.rowErrors);
      acc.dueNow = res.data.dueNow ?? acc.dueNow;
      setProgress(Math.round((Math.min(i + BATCH, toSend.length) / Math.max(1, toSend.length)) * 100));
    }
    setReport(acc);
    setStep("done");
    onDone?.(acc);
  };

  const downloadErrors = () => {
    const esc = csvEscape(";");
    const lines = rows
      .filter((r) => r.errors.length || r.duplicate)
      .map((r) => [r.rowNumber, r.duplicate ? (r.duplicate === "file" ? "Doublon dans le fichier" : "Référence déjà existante") : "", r.errors.join(" | "), r.warnings.join(" | "), ...(parsed?.headers.map((h) => r.raw[h]) ?? [])].map(esc).join(";"));
    const csv = "﻿" + [["Ligne", "Doublon", "Erreurs", "Avertissements", ...(parsed?.headers ?? [])].map(esc).join(";"), ...lines].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-import-${fileName.replace(/\.[^.]+$/, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep("upload");
    setParsed(null);
    setRows([]);
    setReport(null);
    setBuffer(null);
  };

  const stepIndex = { upload: 0, mapping: 1, validation: 2, importing: 3, done: 3 }[step];

  return (
    <div className="space-y-5">
      {!compact && (
        <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Étapes de l'import">
          {["Fichier", "Colonnes", "Vérification", "Import"].map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-medium", i < stepIndex ? "bg-primary text-primary-foreground" : i === stepIndex ? "bg-primary-soft text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground")}>
                {i < stepIndex ? <CheckCircle2 className="size-3.5" /> : i + 1}
              </span>
              <span className={cn(i === stepIndex ? "font-medium" : "text-muted-foreground")}>{label}</span>
              {i < 3 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
            </li>
          ))}
        </ol>
      )}

      {step === "upload" && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void load(f);
              }}
              className={cn("flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors", drag ? "border-primary bg-primary-soft/50" : "hover:border-primary/50 hover:bg-muted/40")}
              data-testid="import-dropzone"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><FileUp className="size-6" /></span>
              <div>
                <p className="font-medium">Déposez votre fichier CSV ici ou cliquez pour le choisir</p>
                <p className="mt-1 text-sm text-muted-foreground">Export de votre logiciel de devis ou d&apos;Excel · point-virgule ou virgule · UTF-8 ou Windows (Excel) · 5 Mo max.</p>
              </div>
              <input ref={input} type="file" accept=".csv,.txt,.tsv,text/csv" className="hidden" data-testid="import-file-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ""; }} />
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">Colonnes reconnues automatiquement : référence, client, email, téléphone, titre, montants HT/TTC, TVA, dates (jj/mm/aaaa), statut.</p>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0 bg-card">
                <a href="/modele-import-devis.csv" download><Download /> Modèle CSV</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Correspondance des colonnes</CardTitle>
            <CardDescription>
              {fileName} · {parsed.rows.length} ligne{parsed.rows.length > 1 ? "s" : ""} · {parsed.headers.length} colonnes. Vérifiez les correspondances proposées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Encodage</p>
                <Select value={encoding} onValueChange={(v) => reparse(v as CsvEncoding, delimiter)}>
                  <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utf-8">UTF-8</SelectItem>
                    <SelectItem value="windows-1252">Windows-1252 (Excel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Séparateur</p>
                <Select value={delimiter} onValueChange={(v) => reparse(encoding, v as CsvDelimiter)}>
                  <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{DELIMS.map((d) => <SelectItem key={d.label} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {IMPORT_FIELDS.map((f) => {
                const idx = mapping[f.key];
                const sample = idx !== undefined ? parsed.rows.find((r) => r[idx])?.[idx] : undefined;
                return (
                  <div key={f.key} className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <label className="text-sm" htmlFor={`map-${f.key}`}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </label>
                    <div className="min-w-0">
                      <Select value={idx === undefined ? "none" : String(idx)} onValueChange={(v) => setMapping((m) => {
                        const next = { ...m };
                        if (v === "none") delete next[f.key as ImportField];
                        else next[f.key as ImportField] = Number(v);
                        return next;
                      })}>
                        <SelectTrigger id={`map-${f.key}`} size="sm" className={cn("w-full", idx === undefined && "text-muted-foreground")}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Ignorer —</SelectItem>
                          {parsed.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {sample && <p className="mt-0.5 truncate text-xs text-muted-foreground">ex. : {sample}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            {missing.length > 0 && (
              <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" /> À associer : {missing.join(", ")}</p>
            )}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Aperçu des premières lignes</p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>{parsed.headers.map((h, i) => <TableHead key={i} className="whitespace-nowrap text-xs">{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 4).map((r, i) => (
                      <TableRow key={i}>{parsed.headers.map((_, j) => <TableCell key={j} className="max-w-[180px] truncate whitespace-nowrap text-xs">{r[j]}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}><ArrowLeft /> Autre fichier</Button>
              <Button onClick={validate} disabled={missing.length > 0} data-testid="import-validate">Vérifier les données <ArrowRight /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "validation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vérification</CardTitle>
            <CardDescription>Rien n&apos;est encore enregistré. Les lignes en erreur et les doublons seront ignorés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryTile label="Prêts à importer" value={summary.valid} tone="success" />
              <SummaryTile label="Doublons" value={summary.duplicates} tone={summary.duplicates ? "warning" : undefined} />
              <SummaryTile label="En erreur" value={summary.errors} tone={summary.errors ? "danger" : undefined} />
              <SummaryTile label="Montant HT importé" text={formatCents(summary.amountHtCents, { round: true })} />
            </div>
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-14 text-xs">Ligne</TableHead>
                    <TableHead className="text-xs">Devis</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-right text-xs">HT</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Contrôle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows].sort((a, b) => Number(b.errors.length > 0) - Number(a.errors.length > 0) || Number(!!b.duplicate) - Number(!!a.duplicate)).slice(0, 300).map((r) => (
                    <TableRow key={r.rowNumber} className={cn(r.errors.length > 0 && "bg-destructive-soft/40", r.duplicate && !r.errors.length && "bg-warning-soft/40")}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{r.data?.reference ?? r.raw[parsed!.headers[mapping.reference ?? 0]] ?? "—"}</div>
                        {r.data && <div className="max-w-[220px] truncate text-xs text-muted-foreground">{r.data.title} · {SERVICE_TYPE_LABELS[r.data.service_type]}</div>}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{r.data?.customer.name ?? "—"}</TableCell>
                      <TableCell className="tabular text-right text-sm">{r.data ? formatCents(r.data.amount_ht_cents, { round: true }) : "—"}</TableCell>
                      <TableCell className="text-xs">{r.data ? `${QUOTE_STATUS_LABELS[r.data.status]}${r.data.sent_on ? ` · ${formatDate(r.data.sent_on, "dd/MM/yy")}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.errors.length > 0 ? (
                          <span className="text-destructive">{r.errors.join(" · ")}</span>
                        ) : r.duplicate ? (
                          <Badge variant="outline" className="border-warning/40 text-[#A75A04]">{r.duplicate === "existing" ? "Déjà dans Relancio" : "Doublon dans le fichier"}</Badge>
                        ) : r.warnings.length > 0 ? (
                          <span className="text-[#A75A04]">{r.warnings.join(" · ")}</span>
                        ) : (
                          <span className="text-success">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep("mapping")}><ArrowLeft /> Colonnes</Button>
                {(summary.errors > 0 || summary.duplicates > 0) && <Button variant="outline" onClick={downloadErrors}><Download /> Rapport des anomalies</Button>}
              </div>
              <Button onClick={runImport} disabled={summary.valid === 0} data-testid="import-run">
                Importer {summary.valid} devis <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium">Import en cours…</p>
            <Progress value={progress} className="mx-auto max-w-sm" />
            <p className="text-sm text-muted-foreground">Création des clients, des devis et calcul des relances.</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && report && (
        <Card>
          <CardContent className="space-y-5 py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-6" /></span>
              <p className="text-lg font-semibold" data-testid="import-report">{report.imported} devis importé{report.imported > 1 ? "s" : ""}</p>
              <p className="text-sm text-muted-foreground">
                {report.createdCustomers} client{report.createdCustomers > 1 ? "s" : ""} créé{report.createdCustomers > 1 ? "s" : ""} · {report.skipped} doublon{report.skipped > 1 ? "s" : ""} ignoré{report.skipped > 1 ? "s" : ""} · {report.errors} erreur{report.errors > 1 ? "s" : ""}
              </p>
              {report.dueNow > 0 && <p className="text-sm text-[#A75A04]">{report.dueNow} relance{report.dueNow > 1 ? "s sont" : " est"} déjà due{report.dueNow > 1 ? "s" : ""} : à valider dans le centre de relances.</p>}
            </div>
            {report.rowErrors.length > 0 && (
              <ul className="mx-auto max-w-lg space-y-1 rounded-md bg-destructive-soft/50 p-3 text-sm text-destructive">
                {report.rowErrors.slice(0, 8).map((e) => <li key={e.rowNumber} className="flex gap-2"><XCircle className="mt-0.5 size-3.5 shrink-0" /> Ligne {e.rowNumber} : {e.message}</li>)}
              </ul>
            )}
            {!compact && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={reset}><RotateCcw /> Importer un autre fichier</Button>
                {(report.errors > 0 || report.skipped > 0) && <Button variant="outline" onClick={downloadErrors}><Download /> Rapport des anomalies</Button>}
                <Button variant="outline" asChild><Link href="/devis">Voir les devis</Link></Button>
                <Button asChild><Link href="/relances">Traiter les relances</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryTile({ label, value, text, tone }: { label: string; value?: number; text?: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-md border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("tabular text-xl font-semibold", tone === "success" && "text-success", tone === "warning" && "text-[#A75A04]", tone === "danger" && "text-destructive")}>{text ?? value}</p>
    </div>
  );
}
