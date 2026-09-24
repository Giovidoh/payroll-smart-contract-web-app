"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import {
  PAYROLL_ADDRESS,
  TOKEN_ADDRESS,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  CHAIN,
} from "@/lib/contracts/config";
import { formatInterval, formatDateTime, shortAddress } from "@/lib/format";
import { Panneau, LienAdresse, Bandeau } from "../ui-kit";
import { useParametres, useOwner } from "../../hooks/use-payroll";
import type { Operation } from "../../hooks/use-transaction";

const champ =
  "w-full rounded-sm border border-line-2 bg-card px-2.5 py-2 font-mono outline-none focus:border-primary";
const principal =
  "rounded-sm border border-primary bg-primary px-3.5 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

export default function Parametres({
  onDemander,
}: {
  onDemander: (o: Operation) => void;
}) {
  const { intervalle, cyclesReserves, dernierePaie } = useParametres();
  const { data: owner } = useOwner();
  const { data: enAttente } = useReadContract({
    abi: payrollAbi,
    address: PAYROLL_ADDRESS,
    functionName: "pendingOwner",
    query: { refetchInterval: 12_000 },
  });

  const [nouveau, setNouveau] = useState("");
  const valide = isAddress(nouveau);
  const memeQueActuel =
    valide && owner && nouveau.toLowerCase() === owner.toLowerCase();

  const transfertEnCours =
    enAttente && enAttente !== "0x0000000000000000000000000000000000000000";

  return (
    <>
      <Panneau titre="Déploiement — lecture seule">
        <dl className="grid gap-1.5">
          <Ligne label="Réseau" valeur={`${CHAIN.name} (id ${CHAIN.id})`} />
          <Ligne label="Contrat Payroll" valeur={<LienAdresse adresse={PAYROLL_ADDRESS} />} />
          <Ligne label="Jeton de règlement" valeur={<LienAdresse adresse={TOKEN_ADDRESS} />} />
          <Ligne label="Symbole / décimales" valeur={`${TOKEN_SYMBOL} · ${TOKEN_DECIMALS}`} />
          <Ligne
            label="Intervalle minimal entre deux paies"
            valeur={intervalle !== undefined ? formatInterval(intervalle) : "…"}
          />
          <Ligne
            label="Cycles de paie réservés"
            valeur={cyclesReserves !== undefined ? String(cyclesReserves) : "…"}
          />
          <Ligne
            label="Horodatage de la dernière paie"
            valeur={dernierePaie ? formatDateTime(dernierePaie) : "…"}
          />
          <Ligne
            label="Propriétaire"
            valeur={owner ? <LienAdresse adresse={owner} /> : "…"}
          />
        </dl>

        <p className="mt-3 text-[11px] text-ink-3">
          Ces paramètres sont fixés au déploiement et ne peuvent pas être modifiés
          depuis l&apos;interface : ils sont déclarés <code className="font-mono">immutable</code>{" "}
          dans le contrat. Les changer suppose de déployer un nouveau contrat.
        </p>
      </Panneau>

      {transfertEnCours && (
        <Bandeau ton="warn" titre="Transfert de propriété en attente.">
          {shortAddress(enAttente!)} a été proposé comme nouveau propriétaire et n&apos;a
          pas encore accepté. Vous restez propriétaire jusque-là.
        </Bandeau>
      )}

      <Panneau titre="Transfert de propriété — deux étapes">
        <p className="mb-3 text-ink-2">
          Le contrat impose un transfert en deux temps : vous proposez une adresse,
          puis son détenteur accepte depuis son propre portefeuille. Une adresse saisie
          par erreur ne peut donc pas emporter le contrat, puisqu&apos;elle ne pourra
          jamais accepter.
        </p>

        <label className="grid gap-1">
          <span className="text-ink-2">Adresse du nouveau propriétaire</span>
          <input
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            placeholder="0x…"
            className={champ}
          />
        </label>
        {nouveau && !valide && <p className="mt-1 text-err">Adresse invalide.</p>}
        {memeQueActuel && (
          <p className="mt-1 text-err">C&apos;est déjà le propriétaire actuel.</p>
        )}

        <button
          className={`${principal} mt-4`}
          disabled={!valide || Boolean(memeQueActuel)}
          onClick={() =>
            onDemander({
              titre: "Proposer le transfert de propriété",
              code: "B9",
              message:
                "Vous proposez le transfert. Vous restez propriétaire tant que le destinataire n'a pas accepté depuis son portefeuille.",
              lignes: [{ label: "Destinataire", valeur: shortAddress(nouveau) }],
              appels: [
                {
                  cible: "payroll",
                  fonction: "transferOwnership",
                  args: [nouveau as Address],
                },
              ],
            })
          }
        >
          Proposer le transfert
        </button>
      </Panneau>
    </>
  );
}

function Ligne({
  label,
  valeur,
}: {
  label: string;
  valeur: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-1.5 last:border-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-mono">{valeur}</dd>
    </div>
  );
}
