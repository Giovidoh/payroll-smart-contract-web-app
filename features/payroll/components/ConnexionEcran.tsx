"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { CHAIN, PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { shortAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/ui/alert";
import { AddressLink } from "@/components/explorer-link";
import { CopyButton } from "@/components/copy-button";
import { Hint } from "@/components/hint";
import { GateLayout } from "./GateLayout";
import { useRole } from "../hooks/use-payroll";

/** Les erreurs de viem tiennent sur plusieurs lignes ; la première suffit ici. */
const premiereLigne = (m: string) => m.split("\n")[0];

export default function ConnexionEcran() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error: erreurConnexion, variables } = useConnect();

  /*
   * Avec plusieurs portefeuilles installés, la découverte EIP-6963 les annonce
   * chacun par son nom. Le connecteur générique « injected » fait alors double
   * emploi et, les extensions se disputant `window.ethereum`, c'est souvent lui
   * qui échoue. On ne le propose que s'il est seul.
   */
  const nommes = connectors.filter((c) => c.id !== "injected");
  const proposes = nommes.length > 0 ? nommes : connectors;
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: bascule } = useSwitchChain();
  const { role, enCours } = useRole();

  const mauvaisReseau = isConnected && chainId !== CHAIN.id;
  const inconnu = isConnected && !mauvaisReseau && !enCours && role === "inconnu";

  const changerDePortefeuille = (
    <Button variant="secondary" size="xl" block className="mt-2" onClick={() => disconnect()}>
      Changer de portefeuille
    </Button>
  );

  const piedDePage = (
    <Hint className="mt-4">
      Contrat <AddressLink address={PAYROLL_ADDRESS} />
    </Hint>
  );

  /* A2 — portefeuille connecté sur le mauvais réseau */
  if (mauvaisReseau) {
    return (
      <GateLayout title="Mauvais réseau" footer={piedDePage}>
        <p className="mb-4 text-ink-2">
          Votre portefeuille est connecté à un autre réseau. Le contrat n&apos;existe
          que sur {CHAIN.name} ; ailleurs, l&apos;adresse ne pointe sur rien.
        </p>
        <Button
          size="xl"
          block
          disabled={bascule}
          onClick={() => switchChain({ chainId: CHAIN.id })}
        >
          {bascule ? "Basculement…" : `Basculer sur ${CHAIN.name}`}
        </Button>
        {changerDePortefeuille}
      </GateLayout>
    );
  }

  /* A3 — connecté, mais ni propriétaire ni salarié */
  if (inconnu) {
    return (
      <GateLayout title="Adresse non reconnue" footer={piedDePage}>
        <p className="mb-3 text-ink-2">
          L&apos;adresse{" "}
          <span className="font-mono">{shortAddress(address!)}</span> ne figure
          ni comme propriétaire du contrat, ni parmi les salariés inscrits.
          Transmettez-la à votre employeur pour qu&apos;il vous inscrive.
        </p>
        <CopyButton value={address} toastMessage="Adresse copiée" size="xl" block>
          Copier mon adresse pour l&apos;employeur
        </CopyButton>
        {changerDePortefeuille}
      </GateLayout>
    );
  }

  /* A1 — état initial */
  return (
    <GateLayout title="Connexion" footer={piedDePage}>
      <p className="mb-4 text-ink-2">
        L&apos;application ne détient aucun compte et ne conserve aucun mot de
        passe : votre portefeuille est votre identité, et le contrat seul
        décide de ce que vous pouvez faire.
      </p>

      {erreurConnexion && (
        <AlertMessage tone="err" className="mb-3">
          La connexion a échoué : {premiereLigne(erreurConnexion.message)}
        </AlertMessage>
      )}

      {proposes.length === 0 ? (
        <AlertMessage tone="warn">
          Aucun portefeuille détecté dans ce navigateur. Installez MetaMask,
          puis rechargez la page.
        </AlertMessage>
      ) : (
        proposes.map((c) => (
          <Button
            key={c.uid}
            size="xl"
            block
            className="mb-2"
            disabled={isPending}
            onClick={() => connect({ connector: c })}
          >
            {isPending && variables?.connector === c
              ? "Connexion…"
              : /* « Injected » est le nom interne du connecteur quand aucun
                   portefeuille ne s'est annoncé : n'imposons pas ce jargon. */
                c.name === "Injected"
                ? "Connecter mon portefeuille"
                : `Connecter ${c.name}`}
          </Button>
        ))
      )}

      {isConnected && enCours && (
        <p className="mt-3 text-ink-3">Lecture du rôle sur la chaîne…</p>
      )}
    </GateLayout>
  );
}
