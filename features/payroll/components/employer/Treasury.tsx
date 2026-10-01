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
  useTreasury,
  useTokenBalance,
  useAllowance,
  useSettings,
} from "../../hooks/use-payroll";
import type { Operation } from "../../hooks/use-transaction";

export default function Treasury({
  onRequest,
}: {
  onRequest: (o: Operation) => void;
}) {
  const { address } = useAccount();
  const { balance, surplus, reserve, payrollTotal, busy } = useTreasury({
    isOwner: true,
  });
  const { data: employerBalance } = useTokenBalance(address);
  const { data: allowance } = useAllowance(address);
  const { reservedCycles } = useSettings();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DepositPanel
        employerBalance={employerBalance}
        allowance={allowance}
        balance={balance}
        onRequest={onRequest}
      />
      <WithdrawPanel surplus={surplus} onRequest={onRequest} />

      <Panel title="Composition du solde" className="lg:col-span-2">
        {busy || balance === undefined ? (
          <SkeletonRows rows={4} />
        ) : (
          <>
            <DetailList>
              <DetailItem label="Solde total du contrat">{formatToken(balance)}</DetailItem>
              <DetailItem label={`Réserve immobilisée (${reservedCycles ?? "…"} cycles)`}>
                {reserve !== undefined ? formatToken(reserve) : "…"}
              </DetailItem>
              <DetailItem label="Masse salariale d'un cycle">
                {payrollTotal !== undefined ? formatToken(payrollTotal) : "…"}
              </DetailItem>
              <DetailTotal label="Surplus retirable">
                {surplus !== undefined ? formatToken(surplus) : "…"}
              </DetailTotal>
            </DetailList>
            <Hint className="mt-3.5">
              La réserve couvre {reservedCycles ?? "plusieurs"} cycles de paie. Le
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

function DepositPanel({
  employerBalance,
  allowance,
  balance,
  onRequest,
}: {
  employerBalance?: bigint;
  allowance?: bigint;
  balance?: bigint;
  onRequest: (o: Operation) => void;
}) {
  const [input, setInput] = useState("");
  const amount = parseTokenOrNull(input);

  const insufficient =
    amount !== null && employerBalance !== undefined && amount > employerBalance;
  const ready = amount !== null && amount > 0n && !insufficient;

  /**
   * Un jeton ERC-20 ne peut pas être « envoyé » à un contrat qui le tire : il faut
   * d'abord autoriser le prélèvement, puis appeler `deposit`. Si l'autorisation
   * couvre déjà le montant, la première transaction est inutile et on l'épargne
   * à l'utilisateur.
   */
  const allowanceSuffices =
    amount !== null && allowance !== undefined && allowance >= amount;

  return (
    <Panel title="Approvisionner le contrat">
      <p className="mb-3 text-ink-2">
        Un dépôt de jeton ERC-20 demande deux transactions successives : autoriser le
        contrat à prélever, puis déposer.
      </p>

      <FormField label={`Montant à déposer (${TOKEN_SYMBOL})`} required>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          placeholder="5000,00"
          className="font-mono"
        />
      </FormField>

      <div className="mt-2 grid gap-1 text-[11px] text-ink-3">
        <span>
          Votre solde :{" "}
          {employerBalance !== undefined ? formatToken(employerBalance) : "…"}
        </span>
        {amount !== null && balance !== undefined && (
          <span>Solde du contrat après dépôt : {formatToken(balance + amount)}</span>
        )}
        {allowanceSuffices && (
          <span className="text-ok">
            Autorisation déjà accordée : une seule transaction suffira.
          </span>
        )}
      </div>

      {insufficient && (
        <FieldError className="mt-2">
          Montant supérieur à votre solde en {TOKEN_SYMBOL}.
        </FieldError>
      )}

      <Button
        block
        className="mt-4"
        disabled={!ready}
        onClick={() =>
          onRequest({
            title: "Approvisionner le contrat",
            code: "B6",
            message:
              "Les fonds déposés deviennent immédiatement soumis à la réserve : la part couvrant les cycles réservés ne pourra plus être retirée.",
            rows: [{ label: "Montant", value: formatToken(amount!) }],
            steps: allowanceSuffices
              ? undefined
              : [
                  `Autoriser le contrat à prélever ${formatToken(amount!)}`,
                  "Déposer les fonds",
                ],
            calls: allowanceSuffices
              ? [{ target: "payroll", functionName: "deposit", args: [amount!] }]
              : [
                  {
                    target: "token",
                    functionName: "approve",
                    args: [PAYROLL_ADDRESS, amount!],
                  },
                  { target: "payroll", functionName: "deposit", args: [amount!] },
                ],
          })
        }
      >
        Déposer {amount !== null ? formatToken(amount) : ""}
      </Button>
    </Panel>
  );
}

function WithdrawPanel({
  surplus,
  onRequest,
}: {
  surplus?: bigint;
  onRequest: (o: Operation) => void;
}) {
  const [input, setInput] = useState("");
  const amount = parseTokenOrNull(input);

  const exceeds = amount !== null && surplus !== undefined && amount > surplus;
  const ready = amount !== null && amount > 0n && !exceeds;

  return (
    <Panel title="Retirer du surplus">
      <p className="mb-3 text-ink-2">
        Seul le surplus est retirable. Le contrat oppose un refus à toute demande qui
        entamerait la réserve, quelle que soit l&apos;adresse qui la formule.
      </p>

      <FormField label={`Montant à retirer (${TOKEN_SYMBOL}) — plafonné au surplus`} required>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
            setInput((Number(surplus) / 1e6).toFixed(2).replace(".", ","))
          }
        >
          Maximum
        </Button>
        <span className="text-[11px] text-ink-3">
          Surplus disponible : {surplus !== undefined ? formatToken(surplus) : "…"}
        </span>
      </div>

      {exceeds && (
        <FieldError className="mt-2">
          Au-delà du surplus : la réserve immobilisée protège les salaires à venir.
        </FieldError>
      )}

      <Button
        block
        className="mt-4"
        disabled={!ready}
        onClick={() =>
          onRequest({
            title: "Retirer du surplus",
            code: "B6",
            message:
              "Ce retrait ne porte que sur la part excédant la réserve. Le contrat vérifiera lui-même que la réserve reste intacte.",
            rows: [{ label: "Montant", value: formatToken(amount!) }],
            calls: [{ target: "payroll", functionName: "withdraw", args: [amount!] }],
          })
        }
      >
        Retirer {amount !== null ? formatToken(amount) : ""}
      </Button>
    </Panel>
  );
}
