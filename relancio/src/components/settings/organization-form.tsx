"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { organizationSchema, type OrganizationInput } from "@/lib/validation/schemas";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/domain/constants";
import { createOrganizationAction, updateOrganizationAction } from "@/server/actions/organization";

export function OrganizationForm({
  defaults,
  mode,
  disabled,
  onSaved,
  submitLabel,
}: {
  defaults: OrganizationInput;
  mode: "create" | "update";
  disabled?: boolean;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const form = useForm<OrganizationInput>({ resolver: zodResolver(organizationSchema, undefined, { raw: true }) as unknown as Resolver<OrganizationInput>, defaultValues: defaults });
  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const res = mode === "create" ? await createOrganizationAction(values) : await updateOrganizationAction(values);
      if (!res.ok) {
        if (res.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) form.setError(k as keyof OrganizationInput, { message: m[0] });
        return void toast.error(res.error);
      }
      if (mode === "update") toast.success("Entreprise mise à jour");
      onSaved?.();
      router.refresh();
    }),
  );
  const text = (n: keyof OrganizationInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormField control={form.control} name={n} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input disabled={disabled} {...props} {...field} value={(field.value as string | null | undefined) ?? ""} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{text("name", "Nom de l'entreprise (utilisé dans les relances)", { autoFocus: mode === "create", placeholder: "Clim Confort Services" })}</div>
          {text("phone", "Téléphone", { type: "tel" })}
          {text("email", "Email de contact", { type: "email" })}
          {text("city", "Ville")}
          {text("siret", "SIRET (facultatif)", { inputMode: "numeric" })}
          {mode === "update" && (
            <>
              <div className="sm:col-span-2">{text("address_line", "Adresse")}</div>
              {text("postal_code", "Code postal")}
              {text("legal_name", "Raison sociale")}
            </>
          )}
        </div>
        <FormField control={form.control} name="trades" render={({ field }) => (
          <FormItem>
            <FormLabel>Vos métiers</FormLabel>
            <ToggleGroup type="multiple" variant="outline" value={field.value ?? []} onValueChange={field.onChange} disabled={disabled} className="flex flex-wrap justify-start gap-2" spacing={2}>
              {SERVICE_TYPES.filter((s) => s !== "autre").map((s) => (
                <ToggleGroupItem key={s} value={s} className="rounded-full px-3 data-[state=on]:border-primary data-[state=on]:bg-primary-soft data-[state=on]:text-primary">
                  {SERVICE_TYPE_LABELS[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FormItem>
        )} />
        {!disabled && <Button type="submit" disabled={pending} data-testid="org-submit">{pending && <Spinner />} {submitLabel ?? "Enregistrer"}</Button>}
      </form>
    </Form>
  );
}
