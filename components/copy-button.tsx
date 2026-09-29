"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copie une valeur dans le presse-papiers et le confirme d'une notification. */
export function CopyButton({
  value,
  toastMessage = "Copié",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "value"> & {
  value: string | undefined;
  toastMessage?: string;
}) {
  return (
    <Button
      {...props}
      onClick={async () => {
        await navigator.clipboard.writeText(value!);
        toast.success(toastMessage);
      }}
    />
  );
}
