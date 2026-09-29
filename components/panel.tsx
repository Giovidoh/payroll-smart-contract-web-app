import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Carte titrée, avec une action facultative à droite de l'en-tête. */
export function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {action}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
