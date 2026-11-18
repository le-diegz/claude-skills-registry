"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { policySchema, type PolicyInput } from "@/lib/validation/schemas";
import { savePolicyAction } from "@/server/actions/organization";
import { computeFollowupDate } from "@/lib/domain/followup-engine";
import { formatDate } from "@/lib/domain/dates";

export function PolicyForm({ defaults, disabled, onSaved, submitLabel = "Enregistrer" }: { defaults: PolicyInput; disabled?: boolean; onSaved?: () => void; submitLabel?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const form = useForm<PolicyInput>({ resolver: zodResolver(policySchema, undefined, { raw: true }) as unknown as Resolver<PolicyInput>, defaultValues: defaults });
  const v = useWatch({ control: form.control });
  const max = Number(v.max_followups ?? 3);

  // Exemple concret de calendrier pour un devis envoyé aujourd'hui
  let example: string[] = [];
  try {
    const [sh, sm] = String(v.window_start ?? "09:00").split(":").map(Number);
    const [eh, em] = String(v.window_end ?? "18:00").split(":").map(Number);
    const p = {
      first_delay_days: Number(v.first_delay_days) || 1,
      second_delay_days: Number(v.second_delay_days) || 1,
      third_delay_days: v.third_delay_days === null || v.third_delay_days === undefined || (v.third_delay_days as unknown) === "" ? null : Number(v.third_delay_days),
      max_followups: max,
      business_days_only: !!v.business_days_only,
      window_start_minutes: sh * 60 + sm,
      window_end_minutes: eh * 60 + em,
    };
    let ref = new Date();
    for (let i = 1; i <= max; i++) {
      const d = computeFollowupDate(p, ref, i);
      if (!d) break;
      example.push(formatDate(d, "EEE d MMM 'à' HH'h'mm"));
      ref = d;
    }
  } catch {
    example = [];
  }

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const res = await savePolicyAction(values);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message, { description: res.data.rescheduled ? `${res.data.rescheduled} relance(s) programmée(s) recalculée(s).` : undefined });
      onSaved?.();
      router.refresh();
    }),
  );

  const num = (name: "first_delay_days" | "second_delay_days" | "third_delay_days", label: string, desc: string, show = true) =>
    show && (
      <FormField control={form.control} name={name} render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl><Input type="number" min={1} max={120} className="w-24" disabled={disabled} {...field} value={(field.value as number | null | undefined) ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} /></FormControl>
            <span className="text-sm text-muted-foreground">jours</span>
          </div>
          <FormDescription>{desc}</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
    );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <FormField control={form.control} name="max_followups" render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre maximal de relances par devis</FormLabel>
            <Select value={String(field.value)} onValueChange={(x) => field.onChange(Number(x))} disabled={disabled}>
              <FormControl><SelectTrigger className="w-40"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="1">1 relance</SelectItem>
                <SelectItem value="2">2 relances</SelectItem>
                <SelectItem value="3">3 relances</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {num("first_delay_days", "1re relance", "après l'envoi du devis")}
          {num("second_delay_days", "2e relance", "après la 1re relance", max >= 2)}
          {num("third_delay_days", "3e relance (facultative)", "après la 2e relance", max >= 3)}
        </div>
        <FormField control={form.control} name="business_days_only" render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <FormLabel>Jours ouvrés uniquement</FormLabel>
              <FormDescription>Du lundi au vendredi, hors jours fériés français.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} /></FormControl>
          </FormItem>
        )} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField control={form.control} name="window_start" render={({ field }) => (
            <FormItem><FormLabel>Envoi autorisé à partir de</FormLabel><FormControl><Input type="time" disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="window_end" render={({ field }) => (
            <FormItem><FormLabel>Jusqu&apos;à</FormLabel><FormControl><Input type="time" disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="auto_expire" render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <FormLabel>Expiration automatique</FormLabel>
              <FormDescription>Un devis dont la date de validité est dépassée passe « Expiré » et n&apos;est plus relancé.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} /></FormControl>
          </FormItem>
        )} />
        {example.length > 0 && (
          <div className="rounded-md bg-primary-soft/60 p-4 text-sm text-accent-foreground">
            <p className="font-medium">Pour un devis envoyé aujourd&apos;hui :</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5">
              {example.map((e, i) => <li key={i}>Relance n°{i + 1} : {e}</li>)}
            </ol>
            <p className="mt-2 text-xs opacity-80">Chaque relance vous est soumise pour validation : rien n&apos;est envoyé automatiquement.</p>
          </div>
        )}
        {!disabled && (
          <Button type="submit" disabled={pending} data-testid="policy-submit">{pending && <Spinner />} {submitLabel}</Button>
        )}
      </form>
    </Form>
  );
}
