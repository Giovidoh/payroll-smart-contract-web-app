import { cn } from "@/lib/utils";

/**
 * Astérisque des champs obligatoires. Un champ marqué conditionne l'opération :
 * sans lui le bouton reste inactif, ou le contrat opposerait un refus. Les
 * champs non marqués — nom, poste, adresse électronique — sont les seules
 * informations hors chaîne, et elles sont facultatives par construction.
 *
 * L'astérisque est décorative ; la mention lisible par les lecteurs d'écran est
 * portée par le texte masqué qui l'accompagne.
 */
export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-err">
        {" *"}
      </span>
      <span className="sr-only"> (obligatoire)</span>
    </>
  );
}

/** Légende qui explique l'astérisque, en tête de formulaire. */
export function RequiredLegend() {
  return (
    <p className="mb-4 text-[11px] text-ink-3">
      Les champs suivis d&apos;un <span className="text-err">*</span> sont
      obligatoires ; les autres sont facultatifs.
    </p>
  );
}

/** Champ libellé : le libellé englobe le contrôle, qui n'a donc pas besoin d'identifiant. */
export function FormField({
  label,
  required = false,
  className,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-ink-2">
        {label}
        {required && <RequiredMark />}
      </span>
      {children}
    </label>
  );
}

/** Message d'erreur sous un champ. */
export function FieldError({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("block text-err", className)} {...props} />;
}
