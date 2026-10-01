"use client";

import { useMemo, useState } from "react";
import { formatToken, formatDateTime } from "@/lib/format";
import { Panel } from "@/components/panel";
import { Table, TableHead, TableCell, TableHeader, TableBody, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { LogsReadError } from "../LogsReadError";
import { SkeletonRows } from "@/components/skeleton-rows";
import { TxLink } from "@/components/explorer-link";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { EventBadge } from "../EventBadge";
import { RegisteredMark } from "../RegisteredMark";
import {
  useEvents,
  type EventType,
  type PayrollEvent,
} from "../../hooks/use-events";
import { useRecords, displayName } from "../../hooks/use-directory";
import { useIssuePayslip, usePayslipRegistry, logKey } from "../../hooks/use-payslips";

const CATEGORIES: Record<string, EventType[]> = {
  all: [],
  payrollRun: ["PayrollCompleted", "SalaryPaid"],
  treasury: ["FundsDeposited", "AmountWithdrawn"],
  staff: ["NewEmployeeAdded", "EmployeeRemoved", "SalaryUpdated"],
};

export default function PayrollHistory() {
  const { data: events, isLoading, isError } = useEvents();
  const records = useRecords();
  const issue = useIssuePayslip();
  const { issued } = usePayslipRegistry();
  const [category, setCategory] = useState<keyof typeof CATEGORIES>("tout");

  const rows = useMemo(() => {
    const all = events ?? [];
    if (category === "tout") return all;
    return all.filter((e) => CATEGORIES[category].includes(e.type));
  }, [events, category]);

  /*
   * SF-08 : l'employeur édite les bulletins d'un cycle. Un cycle, c'est une
   * transaction — `runPayroll` verse à tout l'effectif d'un coup et émet un
   * `SalaryPaid` par salarié dans ce même hachage, puis un `PayrollCompleted`.
   * Les versements d'un cycle se retrouvent donc par leur hachage, et se
   * distinguent entre eux par leur index de journal.
   */
  const cycles = useMemo(() => {
    const byHash = new Map<string, PayrollEvent[]>();
    for (const e of events ?? []) {
      if (e.type !== "SalaryPaid") continue;
      const key = e.hash.toLowerCase();
      const already = byHash.get(key);
      if (already) already.push(e);
      else byHash.set(key, [e]);
    }
    return byHash;
  }, [events]);

  /** Émet les bulletins un à un : chaque salarié a droit au sien, nommément. */
  const issueCycle = async (hash: string) => {
    for (const e of cycles.get(hash.toLowerCase()) ?? []) {
      await issue({
        address: e.subject!,
        amount: e.amount!,
        date: e.date,
        hash: e.hash,
        logIndex: e.logIndex,
      });
    }
  };

  return (
    <Panel
      title={`Historique (${rows.length})`}
      action={
        <NativeSelect
          size="sm"
          value={category}
          onChange={(e) => setCategory(e.target.value as keyof typeof CATEGORIES)}
        >
          <option value="tout">Tout</option>
          <option value="paie">Paie</option>
          <option value="tresorerie">Trésorerie</option>
          <option value="personnel">Personnel</option>
        </NativeSelect>
      }
    >
      <p className="mb-3 text-ink-2">
        Le contrat ne conserve aucun historique en mémoire : tout ce qui suit est
        reconstitué depuis les journaux d&apos;événements de la chaîne. C&apos;est
        cette trace, horodatée et infalsifiable, qui vaut preuve de paiement.
      </p>

      {isLoading ? (
        <SkeletonRows rows={8} />
      ) : isError ? (
        <LogsReadError />
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun événement">
          Rien à afficher pour ce filtre sur la profondeur de journaux consultée.
        </EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Concerne</TableHead>
              <TableHead align="right">Montant</TableHead>
              <TableHead align="right">Transaction</TableHead>
              <TableHead align="right">Bulletin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={`${e.hash}-${e.logIndex}`}>
                <TableCell className="whitespace-nowrap font-mono text-ink-2">
                  {formatDateTime(e.date)}
                </TableCell>
                <TableCell>
                  <EventBadge type={e.type} />
                </TableCell>
                <TableCell className="text-ink-2">
                  {e.type === "PayrollCompleted"
                    ? `${e.headcount} salariés`
                    : e.subject
                      ? displayName(records[e.subject.toLowerCase()], e.subject)
                      : "—"}
                </TableCell>
                <TableCell align="right" className="whitespace-nowrap font-mono">
                  {e.amount !== undefined ? formatToken(e.amount) : "—"}
                  {e.type === "SalaryUpdated" && e.previousAmount !== undefined && (
                    <span className="ml-1 text-[11px] text-ink-3">
                      (avant {formatToken(e.previousAmount, false)})
                    </span>
                  )}
                </TableCell>
                <TableCell align="right">
                  <TxLink hash={e.hash} />
                </TableCell>
                <TableCell align="right" className="whitespace-nowrap">
                  {e.type === "SalaryPaid" ? (
                    <>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          issue({
                            address: e.subject!,
                            amount: e.amount!,
                            date: e.date,
                            hash: e.hash,
                            logIndex: e.logIndex,
                          })
                        }
                      >
                        Éditer
                      </Button>
                      {issued.has(logKey(e.hash, e.logIndex)) && <RegisteredMark />}
                    </>
                  ) : e.type === "PayrollCompleted" ? (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => issueCycle(e.hash)}
                      disabled={(cycles.get(e.hash.toLowerCase()) ?? []).length === 0}
                      className="disabled:opacity-40"
                      title="Éditer un bulletin pour chaque salarié payé dans ce cycle."
                    >
                      Tout le cycle
                    </Button>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
