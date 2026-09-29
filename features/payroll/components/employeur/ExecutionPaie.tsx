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
import { useSalaries, useTresorerie } from "../../hooks/use-payroll";
import { useEcheance } from "../../hooks/use-echeance";
import { useEvenements } from "../../hooks/use-events";
import { useFiches, nomAffiche } from "../../hooks/use-directory";
import type { Operation } from "../../hooks/use-transaction";

export default function ExecutionPaie({
  onDemander,
}: {
  onDemander: (o: Operation) => void;
}) {
  const { data: salaries, isLoading } = useSalaries();
  const { solde, masse } = useTresorerie({ estProprietaire: true });
  const { restant, echue, prochaine } = useEcheance();
  const { data: evenements, isError: echecJournaux } = useEvenements();
  const fiches = useFiches();

  const effectif = salaries?.length ?? 0;
  const provisionne = solde !== undefined && masse !== undefined && solde >= masse;
  const executable = echue === true && provisionne && effectif > 0;

  const cycles = (evenements ?? [])
    .filter((e) => e.type === "PayrollCompleted")
    .slice(0, 3);

  return (
    <>
      {echue === undefined ? (
        <SkeletonRows rows={1} />
      ) : !echue ? (
        <Alert tone="warn" title="Le garde-temps s'y oppose encore.">
          Le contrat rejettera toute exécution pendant{" "}
          {restant !== undefined ? formatCountdown(restant) : "…"} — jusqu&apos;au{" "}
          {prochaine !== undefined ? formatDateTime(prochaine) : "…"}.
        </Alert>
      ) : effectif === 0 ? (
        <Alert tone="warn" title="Aucun bénéficiaire.">
          La liste des salariés est vide : une exécution ne verserait rien.
        </Alert>
      ) : !provisionne ? (
        <Alert tone="err" title="Provision insuffisante.">
          Le contrat détient {solde !== undefined ? formatToken(solde) : "…"} pour une
          masse salariale de {masse !== undefined ? formatToken(masse) : "…"}. Le
          versement est atomique : il échouerait entièrement plutôt que partiellement.
        </Alert>
      ) : (
        <Alert tone="ok" title="Tous les contrôles préalables sont satisfaits.">
          L&apos;échéance est passée, l&apos;effectif est non nul et la provision couvre
          la masse salariale.
        </Alert>
      )}

      <Panel title={`Bénéficiaires de cette exécution (${effectif})`}>
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : effectif === 0 ? (
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
              {salaries!.map((e) => (
                <TableRow key={e.employeeAddress}>
                  <TableCell className="font-medium">
                    {nomAffiche(fiches[e.employeeAddress.toLowerCase()], e.employeeAddress)}
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
                  {masse !== undefined ? formatToken(masse) : "…"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-ink-2">Solde du contrat après opération</TableCell>
                <TableCell>{null}</TableCell>
                <TableCell align="right" className="font-mono text-ink-2">
                  {solde !== undefined && masse !== undefined
                    ? formatToken(solde - masse)
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
          disabled={!executable}
          onClick={() =>
            onDemander({
              titre: "Exécuter la paie",
              code: "B7",
              message:
                "Tous les salaires sont versés en une seule transaction. L'opération est atomique : ou bien chaque salarié est payé, ou bien aucun ne l'est.",
              lignes: [
                { label: "Bénéficiaires", valeur: String(effectif) },
                { label: "Total versé", valeur: formatToken(masse!) },
              ],
              appels: [{ cible: "payroll", fonction: "runPayroll", args: [] }],
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
        {echecJournaux ? (
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
                  <TableCell>{String(c.effectif)} salariés</TableCell>
                  <TableCell align="right" className="font-mono">
                    {c.montant !== undefined ? formatToken(c.montant) : "—"}
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
