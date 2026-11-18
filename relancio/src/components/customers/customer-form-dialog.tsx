"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Pencil, UserPlus } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { customerSchema, type CustomerInput } from "@/lib/validation/schemas";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/domain/constants";
import { createCustomerAction, findCustomerDuplicatesAction, updateCustomerAction } from "@/server/actions/customers";

type Dup = Awaited<ReturnType<typeof findCustomerDuplicatesAction>>;

export function CustomerFormDialog({ customer }: { customer?: CustomerInput & { id: string } }) {
  const [open, setOpen] = useState(false);
  const [dups, setDups] = useState<Dup>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema, undefined, { raw: true }) as unknown as Resolver<CustomerInput>,
    defaultValues: customer ?? { name: "", company_name: "", email: "", phone: "", address_line: "", postal_code: "", city: "", customer_type: "particulier", notes: "", do_not_contact: false },
  });
  const [name, email, phone] = useWatch({ control: form.control, name: ["name", "email", "phone"] });

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!name && !email && !phone) return setDups([]);
      setDups(await findCustomerDuplicatesAction({ name, email: email ?? undefined, phone: phone ?? undefined, excludeId: customer?.id }));
    }, 400);
    return () => clearTimeout(t);
  }, [name, email, phone, open, customer?.id]);

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const res = customer ? await updateCustomerAction(customer.id, values) : await createCustomerAction(values);
      if (!res.ok) {
        if (res.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) form.setError(k as keyof CustomerInput, { message: m[0] });
        return void toast.error(res.error);
      }
      toast.success(res.message ?? "Enregistré");
      setOpen(false);
      if (!customer && res.data && typeof res.data === "object" && "id" in res.data) router.push(`/clients/${(res.data as { id: string }).id}`);
      else router.refresh();
    }),
  );

  const text = (n: keyof CustomerInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormField control={form.control} name={n} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input {...props} {...field} value={(field.value as string | null | undefined) ?? ""} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customer ? <Button variant="outline"><Pencil /> Modifier</Button> : <Button><UserPlus /> Nouveau client</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          <DialogDescription>Seules les informations utiles au suivi commercial sont nécessaires.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{text("name", "Nom", { autoFocus: true, placeholder: "Mme Claire Martin" })}</div>
              {text("company_name", "Entreprise", { placeholder: "Facultatif" })}
              <FormField control={form.control} name="customer_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de client</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              {text("email", "Email", { type: "email" })}
              {text("phone", "Téléphone", { type: "tel", inputMode: "tel" })}
              <div className="sm:col-span-2">{text("address_line", "Adresse")}</div>
              {text("postal_code", "Code postal", { inputMode: "numeric" })}
              {text("city", "Ville")}
            </div>
            {dups.length > 0 && (
              <div className="flex gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-[#7A4303]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">Doublon possible</p>
                  <ul className="mt-1 space-y-0.5">
                    {dups.map((d) => (
                      <li key={d.customer.id}>
                        <Link href={`/clients/${d.customer.id}`} className="underline" onClick={() => setOpen(false)}>{d.customer.name}</Link> — {d.reason === "email" ? "même email" : d.reason === "phone" ? "même téléphone" : "même nom"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="do_not_contact" render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <FormLabel>Ne souhaite plus être recontacté</FormLabel>
                  <FormDescription>Suspend immédiatement toutes les relances de ce client.</FormDescription>
                </div>
                <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={pending}>{pending && <Spinner />} Enregistrer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
