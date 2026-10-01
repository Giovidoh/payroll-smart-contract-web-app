"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import {
  formatToken,
  formatDateTime,
  formatInterval,
} from "@/lib/format";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { Alert } from "@/components/ui/alert";
import { Table, TableHead, TableCell, TableHeader, TableBody, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { LogsReadError } from "../LogsReadError";
import { SkeletonRows } from "@/components/skeleton-rows";
import { TxLink } from "@/components/explorer-link";
import { useEmployees, useTreasury } from "../../hooks/use-payroll";
import { useDueDate } from "../../hooks/use-due-date";
import { Button } from "@/components/ui/button";
import { DetailList, DetailItem, DetailTotal } from "@/components/detail-list";
import { Hint } from "@/components/hint";
import { EventBadge } from "../EventBadge";
import { CountdownFigure } from "../CountdownFigure";
import { useEvents, type PayrollEvent } from "../../hooks/use-events";
import { useRecords, displayName, type EmployeeRecord } from "../../hooks/use-directory";
import type { ScreenCode } from "../AppShell";

export default function Overview({
  onNavigate,
}: {
  onNavigate: (e: ScreenCode) => void;
}) {
  const { address } = useAccount();
  const { data: employees } = useEmployees();
  const { balance, surplus, reserve, payrollTotal } = useTreasury({ isOwner: true });
  const { remaining, isDue, next, lastPayroll, interval, reservedCycles } =
    useDueDate();
  const { data: events, isLoading, isError } = useEvents();
  const records = useRecords();

  const headcount = employees?.length ?? 0;
  const sufficientlyFunded =
    balance !== undefined && payrollTotal !== undefined ? balance >= payrollTotal : undefined;

  const lastCycle = useMemo(
    () => events?.find((e) => e.type === "PayrollCompleted"),
    [events]
  );


  const recent = events?.slice(0, 5) ?? [];

  return (
    <>
      {isDue === undefined ? null : isDue ? (
        sufficientlyFunded ? (
          <Alert tone="ok" title="La paie est exécutable.">
            Le garde-temps ne s&apos;y oppose plus et la provision couvre la masse
            salariale.
          </Alert>
        ) : (
          <Alert tone="err" title="La paie est due mais la provision est insuffisante.">
            Approvisionnez le contrat avant de l&apos;exécuter.
          </Alert>
        )
      ) : (
        <Alert tone="neutral" title="Paie non encore exigible.">
          Le contrat refusera toute exécution avant l&apos;échéance.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Effectif inscrit"
          value={headcount}
          hint={headcount === 0 ? "Aucun salarié" : "salariés en chaîne"}
        />
        <StatCard
          label="Masse salariale"
          value={payrollTotal !== undefined ? formatToken(payrollTotal, false) : "…"}
          hint="par cycle"
        />
        <StatCard
          label="Solde du contrat"
          value={balance !== undefined ? formatToken(balance, false) : "…"}
          hint={
            sufficientlyFunded === undefined
              ? undefined
              : sufficientlyFunded
                ? "provision suffisante"
                : "provision insuffisante"
          }
        />
        <StatCard
          label="Surplus retirable"
          value={surplus !== undefined ? formatToken(surplus, false) : "…"}
          hint={
            reservedCycles !== undefined
              ? `${reservedCycles} cycles immobilisés`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Prochaine paie">
          <CountdownFigure remaining={remaining} whenDue="exécutable maintenant" />
          <p className="mt-1.5 text-ink-2">
            {next !== undefined && interval !== undefined && (
              <>
                Éligible le {formatDateTime(next)} · intervalle de{" "}
                {formatInterval(interval)}
              </>
            )}
          </p>

          <DetailList className="mt-4 border-t border-line pt-3">
            <DetailItem label="Dernière paie">
              {lastPayroll ? formatDateTime(lastPayroll) : "—"}
            </DetailItem>
            <DetailItem label="Dernier cycle observé">
              {lastCycle
                ? `${lastCycle.headcount} salariés · ${formatToken(lastCycle.amount!)}`
                : "aucun"}
            </DetailItem>
          </DetailList>

          <Button size="lg" block className="mt-4 px-3" onClick={() => onNavigate("B7")}>
            Préparer l&apos;exécution de la paie
          </Button>
        </Panel>

        <Panel
          title="Trésorerie"
          action={
            <Button variant="secondary" size="sm" onClick={() => onNavigate("B6")}>
              Gérer
            </Button>
          }
        >
          <TreasuryBar balance={balance} reserve={reserve} surplus={surplus} />
        </Panel>
      </div>

      <Panel
        title="Événements récents"
        action={
          <Button variant="secondary" size="sm" onClick={() => onNavigate("B8")}>
            Tout l&apos;historique
          </Button>
        }
      >
        {isLoading ? (
          <SkeletonRows />
        ) : isError ? (
          <LogsReadError />
        ) : recent.length === 0 ? (
          <EmptyState title="Aucun événement">
            Le contrat n&apos;a encore rien enregistré, ou les journaux consultés ne
            remontent pas jusqu&apos;à son déploiement.
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Détail</TableHead>
                <TableHead align="right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((e) => (
                <EventRow key={`${e.hash}-${e.logIndex}`} e={e} records={records} />
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

function EventRow({
  e,
  records,
}: {
  e: PayrollEvent;
  records: Record<string, EmployeeRecord>;
}) {
  const detail =
    e.type === "PayrollCompleted"
      ? `${e.headcount} salariés payés`
      : e.subject
        ? displayName(records[e.subject.toLowerCase()], e.subject)
        : "—";

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap font-mono text-ink-2">
        {formatDateTime(e.date)}
      </TableCell>
      <TableCell>
        <EventBadge type={e.type} />
      </TableCell>
      <TableCell className="text-ink-2">{detail}</TableCell>
      <TableCell align="right" className="whitespace-nowrap font-mono">
        {e.amount !== undefined ? formatToken(e.amount) : "—"}
      </TableCell>
    </TableRow>
  );
}

function TreasuryBar({
  balance,
  reserve,
  surplus,
}: {
  balance?: bigint;
  reserve?: bigint;
  surplus?: bigint;
}) {
  if (balance === undefined || reserve === undefined || surplus === undefined) {
    return <SkeletonRows rows={3} />;
  }

  const total = balance === 0n ? 1n : balance;
  const pctReserve = Number((reserve * 100n) / total);

  return (
    <>
      <div className="flex h-3 w-full overflow-hidden border border-line-2">
        <div className="bg-primary" style={{ width: `${pctReserve}%` }} />
        <div className="flex-1 bg-surface-3" />
      </div>

      <DetailList className="mt-3">
        <DetailItem
          className="items-center"
          label={<LegendLabel swatch="bg-primary">Réserve immobilisée</LegendLabel>}
        >
          {formatToken(reserve)}
        </DetailItem>
        <DetailItem
          className="items-center"
          label={
            <LegendLabel swatch="border border-line-2 bg-surface-3">Surplus retirable</LegendLabel>
          }
        >
          {formatToken(surplus)}
        </DetailItem>
        <DetailTotal label="Solde total">{formatToken(balance)}</DetailTotal>
      </DetailList>

      <Hint className="mt-3">
        La réserve n&apos;est pas une écriture comptable : le contrat refuse
        matériellement tout retrait qui l&apos;entamerait, y compris au propriétaire.
      </Hint>
    </>
  );
}

/** Libellé précédé d'une pastille à la couleur de sa part dans la barre. */
function LegendLabel({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-foreground">
      <span className={`inline-block size-2.5 ${swatch}`} />
      {children}
    </span>
  );
}
