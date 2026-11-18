"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { quoteSchema, type QuoteInput } from "@/lib/validation/schemas";
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  LOST_REASONS,
  LOST_REASON_LABELS,
  QUOTE_STATUS_LABELS,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  VAT_RATES_BP,
  VAT_RATE_LABELS,
  type QuoteStatus,
} from "@/lib/domain/constants";
import { centsToInput, computeHtCents, computeTtcCents, parseAmountToCents } from "@/lib/domain/money";
import { addDaysToDateOnly, todayParis } from "@/lib/domain/dates";
import { findDuplicateCustomers } from "@/lib/domain/contact";
import { allowedTransitions } from "@/lib/domain/quote-status";
import { createQuoteAction, getQuoteFormDataAction, updateQuoteAction } from "@/server/actions/quotes";
import { CustomerCombobox, type CustomerOption } from "./customer-combobox";

export type QuoteFormInitial = QuoteInput & { currentStatus?: QuoteStatus };

const CREATE_STATUSES: QuoteStatus[] = ["sent", "draft", "pending", "accepted", "declined"];

function defaults(initial?: Partial<QuoteFormInitial>): QuoteInput {
  const today = todayParis();
  return {
    reference: "",
    customer_id: "",
    new_customer: null,
    title: "",
    service_type: "climatisation",
    description: "",
    amount_ht: "",
    vat_rate_bp: 2000,
    amount_ttc: "",
    issued_on: today,
    sent_on: today,
    expires_on: addDaysToDateOnly(today, 30),
    status: "sent",
    owner_id: "",
    notes: "",
    lost_reason: "",
    ...initial,
  };
}

export function QuoteFormDialog({
  open,
  onOpenChange,
  quoteId,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId?: string;
  initial?: Partial<QuoteFormInitial>;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(quoteId);
  const [data, setData] = useState<{ customers: CustomerOption[]; members: { id: string; name: string }[]; reference: string; currentUserId: string } | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [moreOpen, setMoreOpen] = useState(Boolean(initial?.description || initial?.notes));
  const [pending, start] = useTransition();

  const form = useForm<QuoteInput>({ resolver: zodResolver(quoteSchema, undefined, { raw: true }) as unknown as Resolver<QuoteInput>, defaultValues: defaults(initial) });

  useEffect(() => {
    if (!open || data) return;
    getQuoteFormDataAction().then((res) => {
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setData(res.data);
      if (!isEdit && !form.getValues("reference")) form.setValue("reference", res.data.reference);
      if (!form.getValues("owner_id")) form.setValue("owner_id", res.data.currentUserId);
    });
  }, [open, data, isEdit, form]);

  const [status, newCustomer, customerId, vat] = useWatch({ control: form.control, name: ["status", "new_customer", "customer_id", "vat_rate_bp"] });

  const duplicates = useMemo(() => {
    if (!newCustomer || !data) return [];
    return findDuplicateCustomers({ name: newCustomer.name, email: newCustomer.email ?? undefined, phone: newCustomer.phone ?? undefined }, data.customers);
  }, [newCustomer, data]);

  const currentStatus = initial?.currentStatus;
  const statusOptions: QuoteStatus[] = (() => {
    if (!isEdit || !currentStatus) return CREATE_STATUSES;
    const display: QuoteStatus = currentStatus === "to_follow_up" || currentStatus === "followed_up" ? "sent" : currentStatus;
    return [...new Set<QuoteStatus>([display, ...allowedTransitions(currentStatus).filter((s) => s !== "to_follow_up" && s !== "followed_up")])];
  })();

  const recomputeTtc = (htStr: string, rate: number | null) => {
    const ht = parseAmountToCents(htStr);
    if (ht !== null && rate !== null) form.setValue("amount_ttc", centsToInput(computeTtcCents(ht, rate)), { shouldValidate: form.formState.isSubmitted });
  };

  const onSubmit = form.handleSubmit((values) => {
    start(async () => {
      const res = isEdit ? await updateQuoteAction(quoteId!, values) : await createQuoteAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, msgs] of Object.entries(res.fieldErrors)) form.setError(k as keyof QuoteInput, { message: msgs[0] });
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Enregistré");
      onOpenChange(false);
      const createdId = !isEdit && res.data && typeof res.data === "object" && "id" in res.data ? (res.data as { id: string }).id : null;
      if (createdId && onCreated) onCreated(createdId);
      else if (createdId) router.push(`/devis/${createdId}`);
      else router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEdit ? "Modifier le devis" : "Ajouter un devis"}</DialogTitle>
          <DialogDescription>{isEdit ? "Les relances programmées sont recalculées automatiquement." : "Les relances sont programmées automatiquement selon votre politique."}</DialogDescription>
        </DialogHeader>
        {loadError ? (
          <p className="p-6 text-sm text-destructive">{loadError}</p>
        ) : !data ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-9" />
            <div className="grid grid-cols-2 gap-4"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
            <Skeleton className="h-9" />
            <div className="grid grid-cols-3 gap-4"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} noValidate>
              <div className="space-y-5 px-6 py-5">
                {/* Client */}
                {newCustomer ? (
                  <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <legend className="text-sm font-medium">Nouveau client</legend>
                      <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => form.setValue("new_customer", null)}>
                        <X className="size-3.5" /> Choisir un client existant
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField control={form.control} name="new_customer.name" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Nom du client</FormLabel>
                          <FormControl><Input autoFocus placeholder="Mme Claire Martin" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="new_customer.email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="client@exemple.fr" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="new_customer.phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl><Input type="tel" inputMode="tel" placeholder="06 12 34 56 78" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="new_customer.customer_type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    {duplicates.length > 0 && (
                      <div className="flex gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-[#7A4303]">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-medium">Client peut-être déjà existant</p>
                          <ul className="mt-1 space-y-1">
                            {duplicates.map((d) => (
                              <li key={d.customer.id}>
                                {d.customer.name} ({d.reason === "email" ? "même email" : d.reason === "phone" ? "même téléphone" : "même nom"}) —{" "}
                                <button type="button" className="font-medium underline" onClick={() => { form.setValue("new_customer", null); form.setValue("customer_id", d.customer.id); }}>
                                  utiliser ce client
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </fieldset>
                ) : (
                  <FormField control={form.control} name="customer_id" render={({ fieldState }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <CustomerCombobox
                        customers={data.customers}
                        value={customerId || null}
                        invalid={!!fieldState.error}
                        onSelect={(id) => form.setValue("customer_id", id, { shouldValidate: true })}
                        onCreate={(name) => {
                          form.setValue("customer_id", "");
                          form.setValue("new_customer", { name, email: "", phone: "", customer_type: "particulier" });
                          form.clearErrors("customer_id");
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr]">
                  <FormField control={form.control} name="reference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="service_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de prestation</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre du chantier</FormLabel>
                    <FormControl><Input placeholder="Installation climatisation réversible 3 pièces" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_120px_1fr]">
                  <FormField control={form.control} name="amount_ht" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant HT</FormLabel>
                      <InputGroup>
                        <FormControl>
                          <InputGroupInput
                            inputMode="decimal"
                            placeholder="0,00"
                            className="tabular"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              recomputeTtc(e.target.value, vat ?? null);
                            }}
                          />
                        </FormControl>
                        <InputGroupAddon align="inline-end"><InputGroupText>€</InputGroupText></InputGroupAddon>
                      </InputGroup>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vat_rate_bp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>TVA</FormLabel>
                      <Select
                        value={field.value === null ? "mixte" : String(field.value)}
                        onValueChange={(v) => {
                          const rate = v === "mixte" ? null : Number(v);
                          field.onChange(rate);
                          recomputeTtc(form.getValues("amount_ht"), rate);
                        }}
                      >
                        <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {VAT_RATES_BP.map((r) => <SelectItem key={r} value={String(r)}>{VAT_RATE_LABELS[r]}</SelectItem>)}
                          <SelectItem value="mixte">Mixte</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount_ttc" render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Montant TTC</FormLabel>
                      <InputGroup>
                        <FormControl>
                          <InputGroupInput
                            inputMode="decimal"
                            placeholder="0,00"
                            className="tabular"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              const ttc = parseAmountToCents(e.target.value);
                              if (ttc !== null && vat !== null && vat !== undefined) {
                                form.setValue("amount_ht", centsToInput(computeHtCents(ttc, vat)));
                              }
                            }}
                          />
                        </FormControl>
                        <InputGroupAddon align="inline-end"><InputGroupText>€</InputGroupText></InputGroupAddon>
                      </InputGroup>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Statut</FormLabel>
                      <Select value={field.value === "to_follow_up" || field.value === "followed_up" ? "sent" : field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="w-full" data-testid="quote-status-select"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="issued_on" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date du devis</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {status !== "draft" && (
                    <FormField control={form.control} name="sent_on" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d&apos;envoi</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormField control={form.control} name="expires_on" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {(status === "declined" || status === "cancelled") && (
                  <FormField control={form.control} name="lost_reason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motif de perte</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner un motif" /></SelectTrigger></FormControl>
                        <SelectContent>{LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{LOST_REASON_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}

                <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                      <ChevronDown className={`size-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                      Description, responsable, notes
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    <FormField control={form.control} name="owner_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsable</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                          <SelectContent>{data.members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Équipements, contraintes du chantier…" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes internes</FormLabel>
                        <FormControl><Textarea rows={2} placeholder="Visibles uniquement par votre équipe" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <DialogFooter className="sticky bottom-0 border-t bg-card px-6 py-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button type="submit" disabled={pending} data-testid="quote-submit">
                  {pending && <Spinner />}
                  {isEdit ? "Enregistrer" : "Créer le devis"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
