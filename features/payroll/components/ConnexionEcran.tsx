"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { toast } from "sonner";
import { CHAIN, PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { shortAddress } from "@/lib/format";
import { Panneau, LienAdresse } from "./ui-kit";
import { useRole } from "../hooks/use-payroll";

const bouton =
  "w-full rounded-sm border px-3.5 py-3 text-left transition-colors disabled:opacity-50";
const principal = `${bouton} border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90`;
const secondaire = `${bouton} border-line-2 bg-card hover:bg-surface-2`;

export default function ConnexionEcran() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: bascule } = useSwitchChain();
  const { role, enCours } = useRole();

  const mauvaisReseau = isConnected && chainId !== CHAIN.id;
  const inconnu = isConnected && !mauvaisReseau && !enCours && role === "inconnu";

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">Paie Blockchain</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Contrat Payroll · réseau {CHAIN.name}
          </p>
        </div>

        {/* A2 — portefeuille connecté sur le mauvais réseau */}
        {mauvaisReseau ? (
          <Panneau titre="Mauvais réseau">
            <p className="mb-4 text-ink-2">
              Votre portefeuille est connecté à un autre réseau. Le contrat n&apos;existe
              que sur {CHAIN.name} ; ailleurs, l&apos;adresse ne pointe sur rien.
            </p>
            <button
              className={principal}
              disabled={bascule}
              onClick={() => switchChain({ chainId: CHAIN.id })}
            >
              {bascule ? "Basculement…" : `Basculer sur ${CHAIN.name}`}
            </button>
            <button className={`${secondaire} mt-2`} onClick={() => disconnect()}>
              Changer de portefeuille
            </button>
          </Panneau>
        ) : inconnu ? (
          /* A3 — connecté, mais ni propriétaire ni salarié */
          <Panneau titre="Adresse non reconnue">
            <p className="mb-3 text-ink-2">
              L&apos;adresse{" "}
              <span className="font-mono">{shortAddress(address!)}</span> ne figure
              ni comme propriétaire du contrat, ni parmi les salariés inscrits.
              Transmettez-la à votre employeur pour qu&apos;il vous inscrive.
            </p>
            <button
              className={principal}
              onClick={async () => {
                await navigator.clipboard.writeText(address!);
                toast.success("Adresse copiée");
              }}
            >
              Copier mon adresse pour l&apos;employeur
            </button>
            <button className={`${secondaire} mt-2`} onClick={() => disconnect()}>
              Changer de portefeuille
            </button>
          </Panneau>
        ) : (
          /* A1 — état initial */
          <Panneau titre="Connexion">
            <p className="mb-4 text-ink-2">
              L&apos;application ne détient aucun compte et ne conserve aucun mot de
              passe : votre portefeuille est votre identité, et le contrat seul
              décide de ce que vous pouvez faire.
            </p>

            {connectors.length === 0 ? (
              <p className="rounded-sm border border-warn/35 bg-warn-bg px-3 py-2.5 text-warn">
                Aucun portefeuille détecté dans ce navigateur. Installez MetaMask,
                puis rechargez la page.
              </p>
            ) : (
              connectors.map((c) => (
                <button
                  key={c.uid}
                  className={`${principal} mb-2`}
                  disabled={isPending}
                  onClick={() => connect({ connector: c })}
                >
                  {isPending
                    ? "Connexion…"
                    : /* « Injected » est le nom interne du connecteur quand aucun
                         portefeuille ne s'est annoncé : n'imposons pas ce jargon. */
                      c.name === "Injected"
                      ? "Connecter mon portefeuille"
                      : `Connecter ${c.name}`}
                </button>
              ))
            )}

            {isConnected && enCours && (
              <p className="mt-3 text-ink-3">Lecture du rôle sur la chaîne…</p>
            )}
          </Panneau>
        )}

        <p className="mt-4 text-[11px] text-ink-3">
          Contrat <LienAdresse adresse={PAYROLL_ADDRESS} />
        </p>
      </div>
    </main>
  );
}
