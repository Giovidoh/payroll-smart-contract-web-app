"use client";

import { formatToken, formatDateTime } from "@/lib/format";
import { Panel } from "@/components/panel";
import { Table, TableHead, TableCell, TableHeader, TableBody, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { LogsReadError } from "../LogsReadError";
import { SkeletonRows } from "@/components/skeleton-rows";
import { TxLink } from "@/components/explorer-link";
import { Button } from "@/components/ui/button";
import { RegisteredMark } from "../RegisteredMark";
import { useMyAccount } from "../../hooks/use-my-account";
import { useIssuePayslip, usePayslipRegistry, logKey } from "../../hooks/use-payslips";

export default function MyPayslips() {
  const { payments, address, busy, logsFailure } = useMyAccount();
  const issue = useIssuePayslip();
  const { issued } = usePayslipRegistry();

  return (
    <Panel title={`Mes bulletins (${payments.length})`}>
      <p className="mb-3 text-ink-2">
        Un bulletin est produit pour chaque versement. Il est engendré hors chaîne, à
        la demande, et rattaché à la transaction qui l&apos;atteste : le document n&apos;est
        pas la preuve, il en est le reflet lisible.
      </p>

      {busy ? (
        <SkeletonRows rows={5} />
      ) : logsFailure ? (
        <LogsReadError>
          Les journaux n&apos;ont pas pu être lus. Aucun bulletin ne peut être
          produit tant que les versements qu&apos;ils attestent restent
          inaccessibles.
        </LogsReadError>
      ) : payments.length === 0 ? (
        <EmptyState title="Aucun bulletin disponible">
          Un bulletin est produit après chaque paie exécutée. Le premier sera
          disponible dès votre premier versement.
        </EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date du versement</TableHead>
              <TableHead align="right">Montant</TableHead>
              <TableHead align="right">Transaction</TableHead>
              <TableHead align="right">Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((v) => (
              <TableRow key={`${v.hash}-${v.logIndex}`}>
                <TableCell className="whitespace-nowrap font-mono text-ink-2">
                  {formatDateTime(v.date)}
                </TableCell>
                <TableCell align="right" className="font-mono">
                  {formatToken(v.amount!)}
                </TableCell>
                <TableCell align="right">
                  <TxLink hash={v.hash} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() =>
                      issue({
                        address: address!,
                        amount: v.amount!,
                        date: v.date,
                        hash: v.hash,
                        logIndex: v.logIndex,
                      })
                    }
                  >
                    Télécharger
                  </Button>
                  {issued.has(logKey(v.hash, v.logIndex)) && <RegisteredMark />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
