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
import { useSalaries, useTresorerie } from "../../hooks/use-payroll";
import { useEcheance } from "../../hooks/use-echeance";
import { Button } from "@/components/ui/button";
import { DetailList, DetailItem, DetailTotal } from "@/components/detail-list";
import { Hint } from "@/components/hint";
import { EventBadge } from "../EventBadge";
import { CountdownFigure } from "../CountdownFigure";
import { useEvenements, type Evenement } from "../../hooks/use-events";
import { useFiches, nomAffiche, type Fiche } from "../../hooks/use-directory";
import type { Ecran } from "../AppShell";

export default function VueEnsemble({
  onNaviguer,
}: {
  onNaviguer: (e: Ecran) => void;
}) {
  const { address } = useAccount();
  const { data: salaries } = useSalaries();
  const { solde, surplus, reserve, masse } = useTresorerie({ estProprietaire: true });
  const { restant, echue, prochaine, dernierePaie, intervalle, cyclesReserves } =
    useEcheance();
  const { data: evenements, isLoading, isError } = useEvenements();
  const fiches = useFiches();

  const effectif = salaries?.length ?? 0;
  const provisionSuffisante =
    solde !== undefined && masse !== undefined ? solde >= masse : undefined;

  const dernierCycle = useMemo(
    () => evenements?.find((e) => e.type === "PayrollCompleted"),
    [evenements]
  );


  const recents = evenements?.slice(0, 5) ?? [];

  return (
    <>
      {echue === undefined ? null : echue ? (
        provisionSuffisante ? (
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
          value={effectif}
          hint={effectif === 0 ? "Aucun salarié" : "salariés en chaîne"}
        />
        <StatCard
          label="Masse salariale"
          value={masse !== undefined ? formatToken(masse, false) : "…"}
          hint="par cycle"
        />
        <StatCard
          label="Solde du contrat"
          value={solde !== undefined ? formatToken(solde, false) : "…"}
          hint={
            provisionSuffisante === undefined
              ? undefined
              : provisionSuffisante
                ? "provision suffisante"
                : "provision insuffisante"
          }
        />
        <StatCard
          label="Surplus retirable"
          value={surplus !== undefined ? formatToken(surplus, false) : "…"}
          hint={
            cyclesReserves !== undefined
              ? `${cyclesReserves} cycles immobilisés`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Prochaine paie">
          <CountdownFigure remaining={restant} whenDue="exécutable maintenant" />
          <p className="mt-1.5 text-ink-2">
            {prochaine !== undefined && intervalle !== undefined && (
              <>
                Éligible le {formatDateTime(prochaine)} · intervalle de{" "}
                {formatInterval(intervalle)}
              </>
            )}
          </p>

          <DetailList className="mt-4 border-t border-line pt-3">
            <DetailItem label="Dernière paie">
              {dernierePaie ? formatDateTime(dernierePaie) : "—"}
            </DetailItem>
            <DetailItem label="Dernier cycle observé">
              {dernierCycle
                ? `${dernierCycle.effectif} salariés · ${formatToken(dernierCycle.montant!)}`
                : "aucun"}
            </DetailItem>
          </DetailList>

          <Button size="lg" block className="mt-4 px-3" onClick={() => onNaviguer("B7")}>
            Préparer l&apos;exécution de la paie
          </Button>
        </Panel>

        <Panel
          title="Trésorerie"
          action={
            <Button variant="secondary" size="sm" onClick={() => onNaviguer("B6")}>
              Gérer
            </Button>
          }
        >
          <BarreTresorerie solde={solde} reserve={reserve} surplus={surplus} />
        </Panel>
      </div>

      <Panel
        title="Événements récents"
        action={
          <Button variant="secondary" size="sm" onClick={() => onNaviguer("B8")}>
            Tout l&apos;historique
          </Button>
        }
      >
        {isLoading ? (
          <SkeletonRows />
        ) : isError ? (
          <LogsReadError />
        ) : recents.length === 0 ? (
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
              {recents.map((e) => (
                <LigneEvenement key={`${e.hash}-${e.logIndex}`} e={e} fiches={fiches} />
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

function LigneEvenement({
  e,
  fiches,
}: {
  e: Evenement;
  fiches: Record<string, Fiche>;
}) {
  const detail =
    e.type === "PayrollCompleted"
      ? `${e.effectif} salariés payés`
      : e.sujet
        ? nomAffiche(fiches[e.sujet.toLowerCase()], e.sujet)
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
        {e.montant !== undefined ? formatToken(e.montant) : "—"}
      </TableCell>
    </TableRow>
  );
}

function BarreTresorerie({
  solde,
  reserve,
  surplus,
}: {
  solde?: bigint;
  reserve?: bigint;
  surplus?: bigint;
}) {
  if (solde === undefined || reserve === undefined || surplus === undefined) {
    return <SkeletonRows rows={3} />;
  }

  const total = solde === 0n ? 1n : solde;
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
          label={<Legende pastille="bg-primary">Réserve immobilisée</Legende>}
        >
          {formatToken(reserve)}
        </DetailItem>
        <DetailItem
          className="items-center"
          label={
            <Legende pastille="border border-line-2 bg-surface-3">Surplus retirable</Legende>
          }
        >
          {formatToken(surplus)}
        </DetailItem>
        <DetailTotal label="Solde total">{formatToken(solde)}</DetailTotal>
      </DetailList>

      <Hint className="mt-3">
        La réserve n&apos;est pas une écriture comptable : le contrat refuse
        matériellement tout retrait qui l&apos;entamerait, y compris au propriétaire.
      </Hint>
    </>
  );
}

/** Libellé précédé d'une pastille à la couleur de sa part dans la barre. */
function Legende({ pastille, children }: { pastille: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-foreground">
      <span className={`inline-block size-2.5 ${pastille}`} />
      {children}
    </span>
  );
}
