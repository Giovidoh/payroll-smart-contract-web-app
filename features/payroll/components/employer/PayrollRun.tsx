"use client";

import {
  formatToken,
  formatCountdown,
  formatDateTime,
} from "@/lib/format";
import { Panel } from "@/components/panel";
import { Alert } from "@/components/ui/alert";
import { Table, TableHead, TableCell, TableHeader, TableBody, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { LogsReadError } from "../LogsReadError";
import { SkeletonRows } from "@/components/skeleton-rows";
import { AddressLink, TxLink } from "@/components/explorer-link";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { useEmployees, useTreasury } from "../../hooks/use-payroll";
import { useDueDate } from "../../hooks/use-due-date";
import { useEvents } from "../../hooks/use-events";
import { useRecords, displayName } from "../../hooks/use-directory";
import type { Operation } from "../../hooks/use-transaction";

export default function PayrollRun({
  onRequest,
}: {
  onRequest: (o: Operation) => void;
}) {
  const { data: employees, isLoading } = useEmployees();
  const { balance, payrollTotal } = useTreasury({ isOwner: true });
  const { remaining, isDue, next } = useDueDate();
  const { data: events, isError: logsFailure } = useEvents();
  const records = useRecords();

  const headcount = employees?.length ?? 0;
  const funded = balance !== undefined && payrollTotal !== undefined && balance >= payrollTotal;
  const canRun = isDue === true && funded && headcount > 0;

  const cycles = (events ?? [])
    .filter((e) => e.type === "PayrollCompleted")
    .slice(0, 3);

  return (
    <>
      {isDue === undefined ? (
        <SkeletonRows rows={1} />
      ) : !isDue ? (
        <Alert tone="warn" title="Le garde-temps s'y oppose encore.">
          Le contrat rejettera toute exécution pendant{" "}
          {remaining !== undefined ? formatCountdown(remaining) : "…"} — jusqu&apos;au{" "}
          {next !== undefined ? formatDateTime(next) : "…"}.
        </Alert>
      ) : headcount === 0 ? (
        <Alert tone="warn" title="Aucun bénéficiaire.">
          La liste des salariés est vide : une exécution ne verserait rien.
        </Alert>
      ) : !funded ? (
        <Alert tone="err" title="Provision insuffisante.">
          Le contrat détient {balance !== undefined ? formatToken(balance) : "…"} pour une
          masse salariale de {payrollTotal !== undefined ? formatToken(payrollTotal) : "…"}. Le
          versement est atomique : il échouerait entièrement plutôt que partiellement.
        </Alert>
      ) : (
        <Alert tone="ok" title="Tous les contrôles préalables sont satisfaits.">
          L&apos;échéance est passée, l&apos;effectif est non nul et la provision couvre
          la masse salariale.
        </Alert>
      )}

      <Panel title={`Bénéficiaires de cette exécution (${headcount})`}>
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : headcount === 0 ? (
          <EmptyState title="Aucun salarié inscrit" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salarié</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead align="right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees!.map((e) => (
                <TableRow key={e.employeeAddress}>
                  <TableCell className="font-medium">
                    {displayName(records[e.employeeAddress.toLowerCase()], e.employeeAddress)}
                  </TableCell>
                  <TableCell>
                    <AddressLink address={e.employeeAddress} />
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-mono">
                    {formatToken(e.salary)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total versé</TableCell>
                <TableCell>{null}</TableCell>
                <TableCell align="right" className="font-mono font-semibold">
                  {payrollTotal !== undefined ? formatToken(payrollTotal) : "…"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-ink-2">Solde du contrat après opération</TableCell>
                <TableCell>{null}</TableCell>
                <TableCell align="right" className="font-mono text-ink-2">
                  {balance !== undefined && payrollTotal !== undefined
                    ? formatToken(balance - payrollTotal)
                    : "…"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        <Button
          size="lg"
          block
          className="mt-4"
          disabled={!canRun}
          onClick={() =>
            onRequest({
              title: "Exécuter la paie",
              code: "B7",
              message:
                "Tous les salaires sont versés en une seule transaction. L'opération est atomique : ou bien chaque salarié est payé, ou bien aucun ne l'est.",
              rows: [
                { label: "Bénéficiaires", value: String(headcount) },
                { label: "Total versé", value: formatToken(payrollTotal!) },
              ],
              calls: [{ target: "payroll", functionName: "runPayroll", args: [] }],
            })
          }
        >
          Exécuter la paie
        </Button>

        <Hint className="mt-2">
          <code className="font-mono">runPayroll()</code> n&apos;est pas réservée au
          propriétaire : n&apos;importe quelle adresse peut la déclencher, y compris
          un salarié ou l&apos;ordonnanceur. Ce que le contrat garantit n&apos;est pas
          <em> qui</em> paie, mais que le versement est conforme.
        </Hint>
      </Panel>

      <Panel title="Trois dernières exécutions">
        {logsFailure ? (
          <LogsReadError />
        ) : cycles.length === 0 ? (
          <EmptyState title="Aucune exécution observée">
            Aucun cycle de paie n&apos;apparaît dans les journaux consultés.
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bénéficiaires</TableHead>
                <TableHead align="right">Montant</TableHead>
                <TableHead align="right">Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((c) => (
                <TableRow key={`${c.hash}-${c.logIndex}`}>
                  <TableCell className="whitespace-nowrap font-mono text-ink-2">
                    {formatDateTime(c.date)}
                  </TableCell>
                  <TableCell>{String(c.headcount)} salariés</TableCell>
                  <TableCell align="right" className="font-mono">
                    {c.amount !== undefined ? formatToken(c.amount) : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <TxLink hash={c.hash} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
