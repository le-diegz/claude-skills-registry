import { z } from "zod";
import { CUSTOMER_TYPES, LOST_REASONS, QUOTE_STATUSES, SERVICE_TYPES } from "@/lib/domain/constants";
import { parseAmountToCents } from "@/lib/domain/money";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Adresse email invalide")
  .transform((v) => (v ? v.toLowerCase() : null));

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .refine((v) => !v || /^[+\d][\d\s().-]{5,}$/.test(v), "Numéro de téléphone invalide")
  .transform((v) => (v ? v : null));

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const optionalDate = z
  .string()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide")
  .transform((v) => (v ? v : null));

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(160),
  company_name: optionalText(160),
  email: optionalEmail,
  phone: optionalPhone,
  address_line: optionalText(200),
  postal_code: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{5}$/.test(v), "Code postal à 5 chiffres")
    .transform((v) => (v ? v : null)),
  city: optionalText(120),
  customer_type: z.enum(CUSTOMER_TYPES),
  notes: optionalText(5000),
  do_not_contact: z.boolean().optional().default(false),
});
export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerData = z.output<typeof customerSchema>;

export const amountString = z
  .string()
  .trim()
  .min(1, "Montant obligatoire")
  .refine((v) => {
    const c = parseAmountToCents(v);
    return c !== null && c >= 0;
  }, "Montant invalide");

export const quoteSchema = z
  .object({
    reference: z.string().trim().min(1, "La référence est obligatoire").max(60),
    customer_id: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : null)),
    new_customer: z
      .object({
        name: z.string().trim().min(1, "Nom du client obligatoire").max(160),
        email: optionalEmail,
        phone: optionalPhone,
        customer_type: z.enum(CUSTOMER_TYPES).default("particulier"),
      })
      .nullable()
      .optional(),
    title: z.string().trim().min(1, "Le titre du chantier est obligatoire").max(200),
    service_type: z.enum(SERVICE_TYPES),
    description: optionalText(5000),
    amount_ht: amountString,
    vat_rate_bp: z.number().int().min(0).max(10000).nullable(),
    amount_ttc: amountString,
    issued_on: dateOnly,
    sent_on: optionalDate,
    expires_on: optionalDate,
    status: z.enum(QUOTE_STATUSES),
    owner_id: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : null)),
    notes: optionalText(5000),
    lost_reason: z.enum(LOST_REASONS).optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  })
  .superRefine((v, ctx) => {
    if (!v.customer_id && !v.new_customer) {
      ctx.addIssue({ code: "custom", path: ["customer_id"], message: "Sélectionnez ou créez un client" });
    }
    const ht = parseAmountToCents(v.amount_ht);
    const ttc = parseAmountToCents(v.amount_ttc);
    if (ht !== null && ttc !== null && ttc < ht) {
      ctx.addIssue({ code: "custom", path: ["amount_ttc"], message: "Le TTC ne peut pas être inférieur au HT" });
    }
    if (v.expires_on && v.expires_on < v.issued_on) {
      ctx.addIssue({ code: "custom", path: ["expires_on"], message: "L'expiration doit suivre la date du devis" });
    }
    if (v.sent_on && v.sent_on < v.issued_on) {
      ctx.addIssue({ code: "custom", path: ["sent_on"], message: "L'envoi ne peut pas précéder la date du devis" });
    }
    if (v.status === "to_follow_up" || v.status === "followed_up") {
      ctx.addIssue({ code: "custom", path: ["status"], message: "Statut géré automatiquement par les relances" });
    }
  });
export type QuoteInput = z.input<typeof quoteSchema>;
export type QuoteData = z.output<typeof quoteSchema>;

export const policySchema = z
  .object({
    first_delay_days: z.coerce.number().int().min(1, "1 jour minimum").max(90),
    second_delay_days: z.coerce.number().int().min(1).max(90),
    third_delay_days: z.coerce.number().int().min(1).max(120).nullable(),
    max_followups: z.coerce.number().int().min(1).max(3),
    business_days_only: z.boolean(),
    window_start: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
    window_end: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
    auto_expire: z.boolean(),
  })
  .refine((v) => v.window_end > v.window_start, { path: ["window_end"], message: "La fin doit suivre le début" })
  .refine((v) => v.max_followups < 3 || v.third_delay_days !== null, {
    path: ["third_delay_days"],
    message: "Indiquez le délai de la 3e relance",
  });
export type PolicyInput = z.input<typeof policySchema>;

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Nom obligatoire").max(80),
  subject: z.string().trim().min(1, "Objet obligatoire").max(200),
  body: z.string().trim().min(10, "Message trop court").max(5000),
  is_active: z.boolean().default(true),
});
export type TemplateInput = z.input<typeof templateSchema>;

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120),
  legal_name: optionalText(160),
  siret: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\s/g, "") : null))
    .refine((v) => !v || /^\d{14}$/.test(v), "Le SIRET comporte 14 chiffres"),
  email: optionalEmail,
  phone: optionalPhone,
  address_line: optionalText(200),
  postal_code: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{5}$/.test(v), "Code postal à 5 chiffres")
    .transform((v) => (v ? v : null)),
  city: optionalText(120),
  trades: z.array(z.enum(SERVICE_TYPES)).default([]),
});
export type OrganizationInput = z.input<typeof organizationSchema>;

export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum")
  .max(72, "72 caractères maximum")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Utilisez au moins une lettre et un chiffre");

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Indiquez votre nom").max(120),
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: passwordSchema,
  accept_terms: z.literal(true, { message: "Vous devez accepter les conditions" }),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe obligatoire"),
});

export const followupContentSchema = z.object({
  subject: z.string().trim().min(1, "Objet obligatoire").max(200),
  body: z.string().trim().min(1, "Message obligatoire").max(5000),
  recipient_email: optionalEmail,
});
