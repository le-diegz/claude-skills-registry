import Link from "next/link";
import { ArrowRight, BellRing, CalendarCheck2, CheckCircle2, FileUp, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  return (
    <>
      {sp.compte === "supprime" && <p className="bg-success-soft py-2 text-center text-sm text-success">Votre compte a été supprimé.</p>}
      {sp.erreur === "demo" && <p className="bg-destructive-soft py-2 text-center text-sm text-destructive">La démonstration n&apos;a pas pu être créée. Réessayez dans un instant.</p>}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
            Climatisation · Pompes à chaleur · Plomberie · Chauffage
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Vos devis en attente méritent une relance. <span className="text-primary">Au bon moment.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Relancio suit vos devis envoyés, vous dit chaque matin qui relancer et prépare le message. Vous validez, vous envoyez, vous savez où vous en êtes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link href="/inscription">Créer mon compte <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild><a href="/demo">Voir la démo (données fictives)</a></Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Import CSV de vos devis existants · Aucun message envoyé sans votre accord</p>
        </div>
      </section>

      <section className="border-y bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {[
            { icon: FileUp, title: "Importez en 2 minutes", text: "Export CSV de votre logiciel de devis ou d'Excel : point-virgule, décimales et dates françaises reconnus. Doublons détectés." },
            { icon: CalendarCheck2, title: "Échéances calculées", text: "1re relance à J+3, 2e à J+7… en jours ouvrés, hors fériés, dans vos horaires. Vous choisissez les délais." },
            { icon: BellRing, title: "Priorités du jour", text: "Chaque matin, la liste des devis à relancer avec un message prêt et modifiable." },
            { icon: ShieldCheck, title: "Validation obligatoire", text: "Rien ne part sans vous. Copiez le message ou envoyez-le par email si vous l'avez configuré." },
            { icon: CheckCircle2, title: "Arrêt automatique", text: "Devis accepté, refusé ou client qui répond : les relances futures s'arrêtent d'elles-mêmes." },
            { icon: Smartphone, title: "Pensé pour le terrain", text: "Utilisable sur téléphone entre deux chantiers : relance, appel, statut en un geste." },
          ].map((f) => (
            <div key={f.title}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><f.icon className="size-5" /></span>
              <h2 className="mt-4 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-2xl font-semibold">Combien de devis dorment dans vos dossiers ?</h2>
            <p className="mt-1 text-primary-foreground/80">Importez-les et voyez immédiatement lesquels relancer cette semaine.</p>
          </div>
          <Button size="lg" variant="secondary" asChild><Link href="/inscription">Commencer <ArrowRight /></Link></Button>
        </div>
      </section>
    </>
  );
}
