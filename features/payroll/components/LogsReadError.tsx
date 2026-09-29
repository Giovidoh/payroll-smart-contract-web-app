import { ErrorState } from "@/components/empty-state";

/**
 * Une lecture de journaux qui échoue ne doit pas se lire comme une absence
 * d'événements. C'est ici la trace probatoire des versements : annoncer « aucun
 * événement » quand le point d'accès a refusé la requête serait affirmer qu'il
 * n'a jamais été payé, ce que rien ne permet de dire.
 */
export function LogsReadError({ children }: { children?: React.ReactNode }) {
  return (
    <ErrorState title="L'historique n'a pas pu être lu">
      {children ?? (
        <>
          Le point d&apos;accès au réseau a refusé la lecture des journaux. Ce
          n&apos;est pas une absence de versements : c&apos;est une absence de
          réponse. Rien ne peut être conclu de cet écran tant qu&apos;il
          affiche ce message.
        </>
      )}
    </ErrorState>
  );
}
