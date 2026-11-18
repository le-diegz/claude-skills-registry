import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsSection({ title, description, children, footer }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer}
    </Card>
  );
}

export function ReadOnlyNotice() {
  return <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Lecture seule : seuls les administrateurs peuvent modifier ces réglages.</p>;
}
