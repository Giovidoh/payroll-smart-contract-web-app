"use client";

import {
  formatToken,
  formatDateTime,
  shortAddress,
} from "@/lib/format";
import { PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { Alert } from "@/components/ui/alert";
import { Table, TableHead, TableCell, TableHeader, TableBody, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { LogsReadError } from "../LogsReadError";
import { SkeletonRows } from "@/components/skeleton-rows";
import { AddressLink, TxLink } from "@/components/explorer-link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { DetailList, DetailItem } from "@/components/detail-list";
import { Hint } from "@/components/hint";
import { CountdownFigure } from "../CountdownFigure";
import { useMyAccount } from "../../hooks/use-my-account";
import { useDueDate } from "../../hooks/use-due-date";
import { useRecords } from "../../hooks/use-directory";
import type { ScreenCode } from "../AppShell";

/* ------------------------------------------------------------------ C1 */

export function EmployeeView({ onNavigate }: { onNavigate: (e: ScreenCode) => void }) {
  const { salary, payments, totalReceived, busy, logsFailure } = useMyAccount();
  const { remaining, isDue, next } = useDueDate();

  const recent = payments.slice(0, 5);

  return (
    <>
      {isDue && (
        <Alert tone="warn" title="La paie est exigible et n'a pas été exécutée.">
          Le contrat ne connaît pas le retard : passé l&apos;échéance, il attend
          simplement qu&apos;une adresse déclenche le versement. Vous pouvez le faire
          vous-même.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Mon salaire par cycle"
          value={salary !== undefined ? formatToken(salary, false) : "…"}
          hint="tel qu'inscrit en chaîne"
        />
        <StatCard
          label="Versements reçus"
          value={busy ? "…" : logsFailure ? "?" : payments.length}
          hint={
            busy
              ? "lecture des journaux…"
              : logsFailure
                ? "journaux illisibles"
                : "depuis mon inscription"
          }
        />
        <StatCard
          label="Total perçu"
          value={busy ? "…" : logsFailure ? "?" : formatToken(totalReceived, false)}
          hint={logsFailure ? "journaux illisibles" : "cumul des versements"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Prochain versement">
          <CountdownFigure remaining={remaining} whenDue="exigible maintenant" />
          <p className="mt-1.5 text-ink-2">
            {next !== undefined && <>Éligible le {formatDateTime(next)}</>}
          </p>
          <DetailList className="mt-4 border-t border-line pt-3">
            <DetailItem label="Montant attendu">
              {salary !== undefined ? formatToken(salary) : "…"}
            </DetailItem>
          </DetailList>
          <Hint className="mt-3">
            Si la paie n&apos;est pas exécutée alors qu&apos;elle est due et que les
            fonds sont là, vous pouvez la{" "}
            <Button variant="link" size="none" onClick={() => onNavigate("C5")}>
              déclencher vous-même
            </Button>
            .
          </Hint>
        </Panel>

        <Panel
          title="Derniers versements reçus"
          action={
            <Button variant="secondary" size="sm" onClick={() => onNavigate("C2")}>
              Tout voir
            </Button>
          }
        >
          {busy ? (
            <SkeletonRows rows={4} />
          ) : logsFailure ? (
            <LogsReadError />
          ) : recent.length === 0 ? (
            <EmptyState title="Aucun versement">
              Votre première paie apparaîtra ici dès qu&apos;elle sera exécutée.
            </EmptyState>
          ) : (
            <div className="grid gap-1.5">
              {recent.map((v) => (
                <div
                  key={`${v.hash}-${v.logIndex}`}
                  className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-0"
                >
                  <span className="font-mono text-ink-2">{formatDateTime(v.date)}</span>
                  <span className="font-mono">{formatToken(v.amount!)}</span>
                  <TxLink hash={v.hash} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ C2 */

export function MyPayments() {
  const { payments, totalReceived, busy, logsFailure } = useMyAccount();

  return (
    <Panel title={`Mes versements (${payments.length})`}>
      {busy ? (
        <SkeletonRows rows={6} />
      ) : logsFailure ? (
        <LogsReadError />
      ) : payments.length === 0 ? (
        <EmptyState title="Aucun versement pour l'instant">
          Votre première paie apparaîtra ici dès qu&apos;elle sera exécutée. Le compte à
          rebours est visible sur votre vue d&apos;ensemble.
        </EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead align="right">Montant</TableHead>
              <TableHead align="right">Transaction</TableHead>
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
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-semibold">Total perçu</TableCell>
              <TableCell align="right" className="font-mono font-semibold">
                {formatToken(totalReceived)}
              </TableCell>
              <TableCell>{null}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ C4 */

export function MyProfile() {
  const { address, salary } = useMyAccount();
  const records = useRecords();
  const record = address ? records[address.toLowerCase()] : undefined;

  return (
    <>
      <Panel title="Identité — hors chaîne, lecture seule">
        <DetailList>
          <DetailItem ruled mono={false} label="Prénom">{record?.firstName || "non renseigné"}</DetailItem>
          <DetailItem ruled mono={false} label="Nom">{record?.lastName || "non renseigné"}</DetailItem>
          <DetailItem ruled mono={false} label="Poste">{record?.jobTitle || "non renseigné"}</DetailItem>
          <DetailItem ruled mono={false} label="Adresse électronique">{record?.email || "non renseignée"}</DetailItem>
          <DetailItem ruled mono={false} label="Date d'embauche">{record?.hireDate || "non renseignée"}</DetailItem>
          <DetailItem ruled mono={false} label="Salaire par cycle">
            {salary !== undefined ? formatToken(salary) : "…"}
            </DetailItem>
        </DetailList>
        <Hint className="mt-3">
          Pour toute correction d&apos;identité, adressez-vous à l&apos;employeur : ces
          champs vivent hors de la chaîne. Seul le salaire, lui, y est inscrit — et
          reste donc immuable une fois versé.
        </Hint>
      </Panel>

      <Panel title="Confidentialité">
        <p className="text-ink-2">
          Votre fiche n&apos;est consultable que par deux adresses : celle de
          l&apos;employeur, propriétaire du contrat, et la vôtre. Toute autre adresse
          reçoit un refus du contrat lui-même, et non de cette interface.
        </p>
        <p className="mt-2 text-ink-2">
          La réserve n&apos;est cependant pas totale, et il faut le dire. Chaque
          versement émet un événement public portant l&apos;adresse du bénéficiaire et
          le montant : n&apos;importe qui peut lire, dans les journaux de la chaîne,
          ce que reçoit chaque adresse et à quelle date. Ce que la confidentialité
          protège, c&apos;est le lien entre cette adresse et votre <em>nom</em>, qui
          n&apos;a jamais été inscrit en chaîne.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-ink-2">Mon adresse enregistrée</span>
          <span className="font-mono">{address ? shortAddress(address) : "…"}</span>
          <CopyButton value={address} toastMessage="Adresse copiée" variant="secondary" size="xs">
            Copier
          </CopyButton>
          {address && <AddressLink address={address} />}
        </div>

        <Hint className="mt-3">
          Contrat de paie : <AddressLink address={PAYROLL_ADDRESS} />
        </Hint>
      </Panel>
    </>
  );
}

