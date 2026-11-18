"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BellRing, CheckCircle2, FileText, LayoutDashboard, Plus, ShieldCheck, Upload, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { OrganizationForm } from "@/components/settings/organization-form";
import { PolicyForm } from "@/components/settings/policy-form";
import { ImportWizard } from "@/components/import/import-wizard";
import { QuoteFormDialog } from "@/components/quotes/quote-form-dialog";
import { completeOnboardingAction, setOnboardingStepAction } from "@/server/actions/organization";
import type { PolicyInput, OrganizationInput } from "@/lib/validation/schemas";

const STEPS = ["Votre entreprise", "Vos devis", "Vos relances", "C'est parti"];

export function OnboardingFlow({
  initialStep,
  firstName,
  organization,
  policy,
  quoteCount,
  invitations,
}: {
  initialStep: number;
  firstName: string;
  organization: OrganizationInput | null;
  policy: PolicyInput | null;
  quoteCount: number;
  invitations: { id: string; name: string }[];
}) {
  const [step, setStep] = useState(initialStep);
  const [mode, setMode] = useState<"choice" | "import">("choice");
  const [dialog, setDialog] = useState(false);
  const [count, setCount] = useState(quoteCount);
  const [pending, start] = useTransition();
  const router = useRouter();

  const go = (n: number) => {
    setStep(n);
    void setOnboardingStepAction(n);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{step === 1 ? `Bienvenue${firstName ? ` ${firstName}` : ""} 👋` : STEPS[step - 1]}</h1>
        <p className="text-muted-foreground">Quatre étapes rapides pour suivre vos devis et ne plus oublier de relance.</p>
      </div>
      <ol className="grid grid-cols-4 gap-2" aria-label="Progression">
        {STEPS.map((label, i) => (
          <li key={label} className="space-y-1.5">
            <div className={cn("h-1.5 rounded-full", i + 1 <= step ? "bg-primary" : "bg-border")} />
            <p className={cn("hidden text-xs sm:block", i + 1 === step ? "font-medium" : "text-muted-foreground")}>{i + 1}. {label}</p>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <>
          {invitations.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary-soft p-4 text-sm text-accent-foreground">
              <Users className="mt-0.5 size-4 shrink-0" />
              <p>Vous avez été invité à rejoindre <span className="font-medium">{invitations.map((i) => i.name).join(", ")}</span>. Ouvrez le lien reçu par email (ou demandez-le à votre collègue) pour rejoindre l&apos;équipe sans créer d&apos;entreprise.</p>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de l&apos;entreprise</CardTitle>
              <CardDescription>Le nom apparaît dans vos messages de relance. Le reste est facultatif.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationForm
                mode="create"
                submitLabel="Continuer"
                defaults={organization ?? { name: "", phone: "", email: "", city: "", siret: "", trades: [] }}
                onSaved={() => { setStep(2); router.refresh(); }}
              />
            </CardContent>
          </Card>
        </>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {count > 0 && (
            <p className="flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success"><CheckCircle2 className="size-4" /> {count} devis enregistré{count > 1 ? "s" : ""}.</p>
          )}
          {mode === "choice" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setMode("import")} className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm" data-testid="onboarding-import">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Upload className="size-5" /></span>
                <p className="mt-4 font-medium">Importer mes devis en cours</p>
                <p className="mt-1 text-sm text-muted-foreground">Depuis l&apos;export CSV de votre logiciel ou d&apos;Excel. Recommandé : vos relances sont calculées immédiatement.</p>
              </button>
              <button type="button" onClick={() => setDialog(true)} className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm" data-testid="onboarding-create">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Plus className="size-5" /></span>
                <p className="mt-4 font-medium">Saisir un devis</p>
                <p className="mt-1 text-sm text-muted-foreground">Client, montant, date d&apos;envoi : moins d&apos;une minute.</p>
              </button>
            </div>
          ) : (
            <>
              <ImportWizard compact onDone={(r) => setCount((c) => c + r.imported)} />
              <Button variant="ghost" onClick={() => setMode("choice")}>Retour</Button>
            </>
          )}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go(1)}>Retour</Button>
            <Button onClick={() => go(3)} variant={count > 0 ? "default" : "outline"} data-testid="onboarding-next-2">
              {count > 0 ? "Continuer" : "Passer cette étape"} <ArrowRight />
            </Button>
          </div>
          <QuoteFormDialog open={dialog} onOpenChange={setDialog} onCreated={() => { setCount((c) => c + 1); router.refresh(); }} />
        </div>
      )}

      {step === 3 && policy && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Délais de relance</CardTitle>
              <CardDescription>Réglages recommandés pré-remplis. Modifiables à tout moment dans les paramètres.</CardDescription>
            </CardHeader>
            <CardContent>
              <PolicyForm defaults={policy} submitLabel="Enregistrer et continuer" onSaved={() => go(4)} />
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go(2)}>Retour</Button>
            <Button variant="outline" onClick={() => go(4)}>Garder les réglages recommandés <ArrowRight /></Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <ul className="space-y-4">
              {[
                { icon: LayoutDashboard, title: "Vue d'ensemble", text: "Vos devis ouverts, le montant en jeu et les relances du jour, en un coup d'œil." },
                { icon: BellRing, title: "Priorités du jour", text: "Chaque relance due vous est proposée avec un message prêt. Vous le relisez, le modifiez si besoin, puis le validez." },
                { icon: ShieldCheck, title: "Vous gardez la main", text: "Aucun message ne part sans votre validation. Copiez-le dans votre messagerie ou envoyez-le si l'email est configuré." },
                { icon: FileText, title: "Le client a répondu ?", text: "Un clic et les relances s'arrêtent. Devis accepté ou refusé : les relances futures sont annulées automatiquement." },
              ].map((i) => (
                <li key={i.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><i.icon className="size-4" /></span>
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-sm text-muted-foreground">{i.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => go(3)}>Retour</Button>
              <Button disabled={pending} onClick={() => start(async () => { await completeOnboardingAction(); })} data-testid="onboarding-finish">
                {pending && <Spinner />} Accéder au tableau de bord <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
