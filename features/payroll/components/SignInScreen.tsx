"use client";

import { useAccount, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { GateLayout } from "./GateLayout";
import { useSession } from "../hooks/use-session";

/**
 * Authentification de la couche hors chaîne.
 *
 * Le portefeuille est déjà connecté : la chaîne, elle, n'en demande pas
 * davantage, puisqu'elle établit l'appelant d'elle-même à chaque transaction.
 * C'est la base de données qui exige cette étape, n'ayant aucun moyen propre de
 * savoir qui l'interroge.
 *
 * La signature ne coûte rien et n'autorise aucune dépense : elle ne quitte pas
 * le serveur et ne peut pas être présentée à la chaîne.
 */
export default function SignInScreen() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { open, opening, error, mismatched } = useSession();

  return (
    <GateLayout title={mismatched ? "Compte changé" : "Prouvez votre identité"}>
      <p className="mb-4 text-ink-2">
        {mismatched ? (
          <>
            La session ouverte porte sur un autre compte que celui
            actuellement connecté. Signez de nouveau pour que le répertoire
            corresponde à {shortAddress(address ?? "")}.
          </>
        ) : (
          <>
            Le nom, le poste et l&apos;adresse électronique des salariés
            n&apos;existent pas en chaîne : ils sont conservés hors chaîne,
            précisément pour ne pas rendre les rémunérations publiques. Leur
            accès demande donc une signature, que la chaîne n&apos;exigeait
            pas.
          </>
        )}
      </p>

      <Button
        size="xl"
        block
        disabled={opening}
        onClick={() => open().catch(() => undefined)}
      >
        {opening ? "En attente de signature…" : "Signer pour accéder"}
      </Button>

      {error && <p className="mt-3 text-err">{error.message.split("\n")[0]}</p>}

      <Hint className="mt-3">
        Signature gratuite : aucune transaction n&apos;est diffusée, aucun
        frais de réseau n&apos;est engagé, et aucune dépense n&apos;est
        autorisée.
      </Hint>

      <Button
        variant="secondary"
        size="xl"
        block
        className="mt-3"
        onClick={() => disconnect()}
      >
        Changer de portefeuille
      </Button>
    </GateLayout>
  );
}
