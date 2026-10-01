"use client";

import { formatToken, formatCountdown, formatDateTime } from "@/lib/format";
import { Panel } from "@/components/panel";
import { Alert } from "@/components/ui/alert";
import { SkeletonRows } from "@/components/skeleton-rows";
import { Button } from "@/components/ui/button";
import { DetailList, DetailItem, DetailTotal } from "@/components/detail-list";
import { Hint } from "@/components/hint";
import { useMyAccount } from "../../hooks/use-my-account";
import { useDueDate } from "../../hooks/use-due-date";
import type { Operation } from "../../hooks/use-transaction";

export default function TriggerPayroll({
  onRequest,
}: {
  onRequest: (o: Operation) => void;
}) {
  const { payrollTotal, contractBalance, sufficientlyFunded, salary, reserveBreached } =
    useMyAccount();
  const { remaining, isDue, next, delay } = useDueDate();

  const canRun = isDue === true && sufficientlyFunded === true;

  return (
    <>
      {isDue === undefined ? (
        <SkeletonRows rows={1} />
      ) : !isDue ? (
        <Alert tone="neutral" title="La paie n'est pas encore exigible.">
          Le contrat refusera toute exécution pendant{" "}
          {remaining !== undefined ? formatCountdown(remaining) : "…"}, jusqu&apos;au{" "}
          {next !== undefined ? formatDateTime(next) : "…"}.
        </Alert>
      ) : !sufficientlyFunded ? (
        <Alert tone="err" title="La paie est exigible mais le contrat n'est pas provisionné.">
          Il détient {contractBalance !== undefined ? formatToken(contractBalance) : "…"} pour
          une masse salariale de{" "}
          {payrollTotal !== undefined ? formatToken(payrollTotal) : "un montant indéterminé"}. Seul
          l&apos;employeur peut
          l&apos;approvisionner ; le déclenchement échouerait.
        </Alert>
      ) : (
        <Alert tone="ok" title="Vous pouvez déclencher la paie.">
          L&apos;échéance est passée depuis {formatCountdown(delay) ?? "peu"} et la
          provision couvre la masse salariale.
        </Alert>
      )}

      <Panel title="Pourquoi vous, et pas seulement l'employeur">
        <p className="text-ink-2">
          La fonction qui verse les salaires n&apos;est pas réservée au propriétaire du
          contrat : <code className="font-mono">runPayroll()</code> est ouverte à toute
          adresse. Ce n&apos;est pas un oubli, c&apos;est la conséquence du dispositif.
          Une fois l&apos;échéance atteinte et la provision constituée, plus rien ne
          dépend de la diligence de l&apos;employeur : le versement est dû, les fonds
          sont là, et n&apos;importe qui peut le faire aboutir.
        </p>
        <p className="mt-2 text-ink-2">
          Vous n&apos;avancez pas les salaires : les fonds versés sont ceux du contrat.
          Vous n&apos;avancez que les frais de réseau de la transaction, soit une
          fraction d&apos;ETH.
        </p>
        <p className="mt-2 text-ink-2">
          Le versement est global : il paie l&apos;ensemble des salariés, pas seulement
          vous. Le contrat ne sait pas payer une seule personne.
        </p>
      </Panel>

      <Panel title="État de la trésorerie">
        <DetailList>
          <DetailItem label="Solde du contrat">
            {contractBalance !== undefined ? formatToken(contractBalance) : "…"}
          </DetailItem>
          <DetailItem label="Masse salariale à verser">
            {payrollTotal !== undefined ? formatToken(payrollTotal) : "indisponible"}
          </DetailItem>
          <DetailTotal label="Dont pour vous">
            {salary !== undefined ? formatToken(salary) : "…"}
          </DetailTotal>
        </DetailList>

        <Hint className="mt-3">
          {reserveBreached
            ? "Le contrat ne détient même pas de quoi couvrir la réserve : il est sous-provisionné, et la masse salariale n'est pas calculable de votre côté."
            : "Vous n'avez pas accès à la liste des bénéficiaires, que le contrat réserve à son propriétaire. La masse salariale affichée ici est déduite du solde, du surplus retirable et du nombre de cycles réservés, tous trois publics."}
        </Hint>

        <Button
          size="lg"
          block
          className="mt-4"
          disabled={!canRun}
          onClick={() =>
            onRequest({
              title: "Déclencher la paie",
              message:
                "Vous déclenchez le versement de l'ensemble des salaires. Les fonds sont ceux du contrat ; vous n'avancez que les frais de réseau.",
              rows: [
                {
                  label: "Total versé",
                  value: payrollTotal !== undefined ? formatToken(payrollTotal) : "—",
                },
                {
                  label: "Dont pour vous",
                  value: salary !== undefined ? formatToken(salary) : "—",
                },
              ],
              calls: [{ target: "payroll", functionName: "runPayroll", args: [] }],
            })
          }
        >
          Déclencher la paie
        </Button>
      </Panel>
    </>
  );
}

