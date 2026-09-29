"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatToken, parseTokenOrNull } from "@/lib/format";
import { TOKEN_SYMBOL, PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FieldError } from "@/components/form-field";
import { DetailList, DetailItem, DetailTotal } from "@/components/detail-list";
import { Hint } from "@/components/hint";
import { SkeletonRows } from "@/components/skeleton-rows";
import {
  useTresorerie,
  useSoldeJeton,
  useAutorisation,
  useParametres,
} from "../../hooks/use-payroll";
import type { Operation } from "../../hooks/use-transaction";

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

      <Panel title="Composition du solde" className="lg:col-span-2">
        {enCours || solde === undefined ? (
          <SkeletonRows rows={4} />
        ) : (
          <>
            <DetailList>
              <DetailItem label="Solde total du contrat">{formatToken(solde)}</DetailItem>
              <DetailItem label={`Réserve immobilisée (${cyclesReserves ?? "…"} cycles)`}>
                {reserve !== undefined ? formatToken(reserve) : "…"}
              </DetailItem>
              <DetailItem label="Masse salariale d'un cycle">
                {masse !== undefined ? formatToken(masse) : "…"}
              </DetailItem>
              <DetailTotal label="Surplus retirable">
                {surplus !== undefined ? formatToken(surplus) : "…"}
              </DetailTotal>
            </DetailList>
            <Hint className="mt-3.5">
              La réserve couvre {cyclesReserves ?? "plusieurs"} cycles de paie. Le
              contrat refuse tout retrait qui l&apos;entamerait, y compris au
              propriétaire : c&apos;est ce qui fait de la créance de salaire une
              garantie opposable à l&apos;employeur lui-même.
            </Hint>
          </>
        )}
      </Panel>
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
  const montant = parseTokenOrNull(saisie);

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
    <Panel title="Approvisionner le contrat">
      <p className="mb-3 text-ink-2">
        Un dépôt de jeton ERC-20 demande deux transactions successives : autoriser le
        contrat à prélever, puis déposer.
      </p>

      <FormField label={`Montant à déposer (${TOKEN_SYMBOL})`} required>
        <Input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="decimal"
          placeholder="5000,00"
          className="font-mono"
        />
      </FormField>

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
        <FieldError className="mt-2">
          Montant supérieur à votre solde en {TOKEN_SYMBOL}.
        </FieldError>
      )}

      <Button
        block
        className="mt-4"
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
      </Button>
    </Panel>
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
  const montant = parseTokenOrNull(saisie);

  const depasse = montant !== null && surplus !== undefined && montant > surplus;
  const pret = montant !== null && montant > 0n && !depasse;

  return (
    <Panel title="Retirer du surplus">
      <p className="mb-3 text-ink-2">
        Seul le surplus est retirable. Le contrat oppose un refus à toute demande qui
        entamerait la réserve, quelle que soit l&apos;adresse qui la formule.
      </p>

      <FormField label={`Montant à retirer (${TOKEN_SYMBOL}) — plafonné au surplus`} required>
        <Input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="decimal"
          className="font-mono"
        />
      </FormField>

      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="secondary"
          size="xs"
          disabled={surplus === undefined || surplus === 0n}
          onClick={() =>
            surplus !== undefined &&
            setSaisie((Number(surplus) / 1e6).toFixed(2).replace(".", ","))
          }
        >
          Maximum
        </Button>
        <span className="text-[11px] text-ink-3">
          Surplus disponible : {surplus !== undefined ? formatToken(surplus) : "…"}
        </span>
      </div>

      {depasse && (
        <FieldError className="mt-2">
          Au-delà du surplus : la réserve immobilisée protège les salaires à venir.
        </FieldError>
      )}

      <Button
        block
        className="mt-4"
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
      </Button>
    </Panel>
  );
}
