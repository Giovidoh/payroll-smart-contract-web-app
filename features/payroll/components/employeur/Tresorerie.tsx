"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatToken, parseToken } from "@/lib/format";
import { TOKEN_SYMBOL, PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { Panneau, Requis, Squelette } from "../ui-kit";
import {
  useTresorerie,
  useSoldeJeton,
  useAutorisation,
  useParametres,
} from "../../hooks/use-payroll";
import type { Operation } from "../../hooks/use-transaction";

const champ =
  "w-full rounded-sm border border-line-2 bg-card px-2.5 py-2 font-mono outline-none focus:border-primary";
const principal =
  "rounded-sm border border-primary bg-primary px-3.5 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

export default function Tresorerie({
  onDemander,
}: {
  onDemander: (o: Operation) => void;
}) {
  const { address } = useAccount();
  const { solde, surplus, reserve, masse, enCours } = useTresorerie({
    estProprietaire: true,
  });
  const { data: soldeEmployeur } = useSoldeJeton(address);
  const { data: autorisation } = useAutorisation(address);
  const { cyclesReserves } = useParametres();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PanneauDepot
        soldeEmployeur={soldeEmployeur}
        autorisation={autorisation}
        solde={solde}
        onDemander={onDemander}
      />
      <PanneauRetrait surplus={surplus} onDemander={onDemander} />

      <Panneau titre="Composition du solde" className="lg:col-span-2">
        {enCours || solde === undefined ? (
          <Squelette lignes={4} />
        ) : (
          <div className="grid gap-1.5">
            <Ligne label="Solde total du contrat" valeur={formatToken(solde)} />
            <Ligne
              label={`Réserve immobilisée (${cyclesReserves ?? "…"} cycles)`}
              valeur={reserve !== undefined ? formatToken(reserve) : "…"}
            />
            <Ligne
              label="Masse salariale d'un cycle"
              valeur={masse !== undefined ? formatToken(masse) : "…"}
            />
            <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
              <span>Surplus retirable</span>
              <span className="font-mono">
                {surplus !== undefined ? formatToken(surplus) : "…"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-ink-3">
              La réserve couvre {cyclesReserves ?? "plusieurs"} cycles de paie. Le
              contrat refuse tout retrait qui l&apos;entamerait, y compris au
              propriétaire : c&apos;est ce qui fait de la créance de salaire une
              garantie opposable à l&apos;employeur lui-même.
            </p>
          </div>
        )}
      </Panneau>
    </div>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="font-mono">{valeur}</span>
    </div>
  );
}

function PanneauDepot({
  soldeEmployeur,
  autorisation,
  solde,
  onDemander,
}: {
  soldeEmployeur?: bigint;
  autorisation?: bigint;
  solde?: bigint;
  onDemander: (o: Operation) => void;
}) {
  const [saisie, setSaisie] = useState("");

  let montant: bigint | null = null;
  try {
    montant = saisie ? parseToken(saisie) : null;
  } catch {
    montant = null;
  }

  const insuffisant =
    montant !== null && soldeEmployeur !== undefined && montant > soldeEmployeur;
  const pret = montant !== null && montant > 0n && !insuffisant;

  /**
   * Un jeton ERC-20 ne peut pas être « envoyé » à un contrat qui le tire : il faut
   * d'abord autoriser le prélèvement, puis appeler `deposit`. Si l'autorisation
   * couvre déjà le montant, la première transaction est inutile et on l'épargne
   * à l'utilisateur.
   */
  const autorisationSuffit =
    montant !== null && autorisation !== undefined && autorisation >= montant;

  return (
    <Panneau titre="Approvisionner le contrat">
      <p className="mb-3 text-ink-2">
        Un dépôt de jeton ERC-20 demande deux transactions successives : autoriser le
        contrat à prélever, puis déposer.
      </p>

      <label className="grid gap-1">
        <span className="text-ink-2">
          Montant à déposer ({TOKEN_SYMBOL})
          <Requis />
        </span>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="decimal"
          placeholder="5000,00"
          className={champ}
        />
      </label>

      <div className="mt-2 grid gap-1 text-[11px] text-ink-3">
        <span>
          Votre solde :{" "}
          {soldeEmployeur !== undefined ? formatToken(soldeEmployeur) : "…"}
        </span>
        {montant !== null && solde !== undefined && (
          <span>Solde du contrat après dépôt : {formatToken(solde + montant)}</span>
        )}
        {autorisationSuffit && (
          <span className="text-ok">
            Autorisation déjà accordée : une seule transaction suffira.
          </span>
        )}
      </div>

      {insuffisant && (
        <p className="mt-2 text-err">
          Montant supérieur à votre solde en {TOKEN_SYMBOL}.
        </p>
      )}

      <button
        className={`${principal} mt-4 w-full text-left`}
        disabled={!pret}
        onClick={() =>
          onDemander({
            titre: "Approvisionner le contrat",
            code: "B6",
            message:
              "Les fonds déposés deviennent immédiatement soumis à la réserve : la part couvrant les cycles réservés ne pourra plus être retirée.",
            lignes: [{ label: "Montant", valeur: formatToken(montant!) }],
            etapes: autorisationSuffit
              ? undefined
              : [
                  `Autoriser le contrat à prélever ${formatToken(montant!)}`,
                  "Déposer les fonds",
                ],
            appels: autorisationSuffit
              ? [{ cible: "payroll", fonction: "deposit", args: [montant!] }]
              : [
                  {
                    cible: "token",
                    fonction: "approve",
                    args: [PAYROLL_ADDRESS, montant!],
                  },
                  { cible: "payroll", fonction: "deposit", args: [montant!] },
                ],
          })
        }
      >
        Déposer {montant !== null ? formatToken(montant) : ""}
      </button>
    </Panneau>
  );
}

function PanneauRetrait({
  surplus,
  onDemander,
}: {
  surplus?: bigint;
  onDemander: (o: Operation) => void;
}) {
  const [saisie, setSaisie] = useState("");

  let montant: bigint | null = null;
  try {
    montant = saisie ? parseToken(saisie) : null;
  } catch {
    montant = null;
  }

  const depasse = montant !== null && surplus !== undefined && montant > surplus;
  const pret = montant !== null && montant > 0n && !depasse;

  return (
    <Panneau titre="Retirer du surplus">
      <p className="mb-3 text-ink-2">
        Seul le surplus est retirable. Le contrat oppose un refus à toute demande qui
        entamerait la réserve, quelle que soit l&apos;adresse qui la formule.
      </p>

      <label className="grid gap-1">
        <span className="text-ink-2">
          Montant à retirer ({TOKEN_SYMBOL}) — plafonné au surplus
          <Requis />
        </span>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="decimal"
          className={champ}
        />
      </label>

      <div className="mt-2 flex items-center gap-2">
        <button
          className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
          disabled={surplus === undefined || surplus === 0n}
          onClick={() =>
            surplus !== undefined &&
            setSaisie((Number(surplus) / 1e6).toFixed(2).replace(".", ","))
          }
        >
          Maximum
        </button>
        <span className="text-[11px] text-ink-3">
          Surplus disponible : {surplus !== undefined ? formatToken(surplus) : "…"}
        </span>
      </div>

      {depasse && (
        <p className="mt-2 text-err">
          Au-delà du surplus : la réserve immobilisée protège les salaires à venir.
        </p>
      )}

      <button
        className={`${principal} mt-4 w-full text-left`}
        disabled={!pret}
        onClick={() =>
          onDemander({
            titre: "Retirer du surplus",
            code: "B6",
            message:
              "Ce retrait ne porte que sur la part excédant la réserve. Le contrat vérifiera lui-même que la réserve reste intacte.",
            lignes: [{ label: "Montant", valeur: formatToken(montant!) }],
            appels: [{ cible: "payroll", fonction: "withdraw", args: [montant!] }],
          })
        }
      >
        Retirer {montant !== null ? formatToken(montant) : ""}
      </button>
    </Panneau>
  );
}
