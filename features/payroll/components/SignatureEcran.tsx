"use client";

import { useAccount, useDisconnect } from "wagmi";
import { CHAIN } from "@/lib/contracts/config";
import { shortAddress } from "@/lib/format";
import { Panneau } from "./ui-kit";
import { useSession } from "../hooks/use-session";

const bouton =
  "w-full rounded-sm border px-3.5 py-3 text-left transition-colors disabled:opacity-50";
const principal = `${bouton} border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90`;
const secondaire = `${bouton} border-line-2 bg-card hover:bg-surface-2`;

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
export default function SignatureEcran() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { ouvrir, ouvertureEnCours, erreur, desaccordee } = useSession();

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">Paie Blockchain</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Contrat Payroll · réseau {CHAIN.name}
          </p>
        </div>

        <Panneau titre={desaccordee ? "Compte changé" : "Prouvez votre identité"}>
          <p className="mb-4 text-ink-2">
            {desaccordee ? (
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

          <button
            className={principal}
            disabled={ouvertureEnCours}
            onClick={() => ouvrir().catch(() => undefined)}
          >
            {ouvertureEnCours ? "En attente de signature…" : "Signer pour accéder"}
          </button>

          {erreur && (
            <p className="mt-3 text-err">{erreur.message.split("\n")[0]}</p>
          )}

          <p className="mt-3 text-[11px] text-ink-3">
            Signature gratuite : aucune transaction n&apos;est diffusée, aucun
            frais de réseau n&apos;est engagé, et aucune dépense n&apos;est
            autorisée.
          </p>

          <button className={`${secondaire} mt-3`} onClick={() => disconnect()}>
            Changer de portefeuille
          </button>
        </Panneau>
      </div>
    </main>
  );
}
