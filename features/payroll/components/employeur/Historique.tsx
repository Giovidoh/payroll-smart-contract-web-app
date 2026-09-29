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
  useEvenements,
  type TypeEvenement,
  type Evenement,
} from "../../hooks/use-events";
import { useFiches, nomAffiche } from "../../hooks/use-directory";
import { useEmettreBulletin, useRegistre, repere } from "../../hooks/use-bulletins";

const FAMILLES: Record<string, TypeEvenement[]> = {
  tout: [],
  paie: ["PayrollCompleted", "SalaryPaid"],
  tresorerie: ["FundsDeposited", "AmountWithdrawn"],
  personnel: ["NewEmployeeAdded", "EmployeeRemoved", "SalaryUpdated"],
};

export default function Historique() {
  const { data: evenements, isLoading, isError } = useEvenements();
  const fiches = useFiches();
  const emettre = useEmettreBulletin();
  const { emis } = useRegistre();
  const [famille, setFamille] = useState<keyof typeof FAMILLES>("tout");

  const lignes = useMemo(() => {
    const tous = evenements ?? [];
    if (famille === "tout") return tous;
    return tous.filter((e) => FAMILLES[famille].includes(e.type));
  }, [evenements, famille]);

  /*
   * SF-08 : l'employeur édite les bulletins d'un cycle. Un cycle, c'est une
   * transaction — `runPayroll` verse à tout l'effectif d'un coup et émet un
   * `SalaryPaid` par salarié dans ce même hachage, puis un `PayrollCompleted`.
   * Les versements d'un cycle se retrouvent donc par leur hachage, et se
   * distinguent entre eux par leur index de journal.
   */
  const cycles = useMemo(() => {
    const parHash = new Map<string, Evenement[]>();
    for (const e of evenements ?? []) {
      if (e.type !== "SalaryPaid") continue;
      const clef = e.hash.toLowerCase();
      const deja = parHash.get(clef);
      if (deja) deja.push(e);
      else parHash.set(clef, [e]);
    }
    return parHash;
  }, [evenements]);

  /** Émet les bulletins un à un : chaque salarié a droit au sien, nommément. */
  const emettreCycle = async (hash: string) => {
    for (const e of cycles.get(hash.toLowerCase()) ?? []) {
      await emettre({
        adresse: e.sujet!,
        montant: e.montant!,
        date: e.date,
        hash: e.hash,
        logIndex: e.logIndex,
      });
    }
  };

  return (
    <Panel
      title={`Historique (${lignes.length})`}
      action={
        <NativeSelect
          size="sm"
          value={famille}
          onChange={(e) => setFamille(e.target.value as keyof typeof FAMILLES)}
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
      ) : lignes.length === 0 ? (
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
            {lignes.map((e) => (
              <TableRow key={`${e.hash}-${e.logIndex}`}>
                <TableCell className="whitespace-nowrap font-mono text-ink-2">
                  {formatDateTime(e.date)}
                </TableCell>
                <TableCell>
                  <EventBadge type={e.type} />
                </TableCell>
                <TableCell className="text-ink-2">
                  {e.type === "PayrollCompleted"
                    ? `${e.effectif} salariés`
                    : e.sujet
                      ? nomAffiche(fiches[e.sujet.toLowerCase()], e.sujet)
                      : "—"}
                </TableCell>
                <TableCell align="right" className="whitespace-nowrap font-mono">
                  {e.montant !== undefined ? formatToken(e.montant) : "—"}
                  {e.type === "SalaryUpdated" && e.ancienMontant !== undefined && (
                    <span className="ml-1 text-[11px] text-ink-3">
                      (avant {formatToken(e.ancienMontant, false)})
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
                          emettre({
                            adresse: e.sujet!,
                            montant: e.montant!,
                            date: e.date,
                            hash: e.hash,
                            logIndex: e.logIndex,
                          })
                        }
                      >
                        Éditer
                      </Button>
                      {emis.has(repere(e.hash, e.logIndex)) && <RegisteredMark />}
                    </>
                  ) : e.type === "PayrollCompleted" ? (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => emettreCycle(e.hash)}
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
