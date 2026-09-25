"use client";

import { useMemo, useState } from "react";
import { formatToken, formatDateTime } from "@/lib/format";
import {
  Panneau,
  Tableau,
  Th,
  Td,
  Vide,
  Echec,
  Squelette,
  Etiquette,
  LienTransaction,
} from "../ui-kit";
import {
  useEvenements,
  LIBELLES,
  type TypeEvenement,
  type Evenement,
} from "../../hooks/use-events";
import { useFiches, nomAffiche } from "../../hooks/use-directory";
import { useEmettreBulletin, useRegistre, repere } from "../../hooks/use-bulletins";

const TON: Record<string, "ok" | "warn" | "accent" | "neutre"> = {
  PayrollCompleted: "ok",
  SalaryPaid: "ok",
  FundsDeposited: "accent",
  EmployeeRemoved: "warn",
  AmountWithdrawn: "warn",
};

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
    <Panneau
      titre={`Historique (${lignes.length})`}
      action={
        <select
          value={famille}
          onChange={(e) => setFamille(e.target.value as keyof typeof FAMILLES)}
          className="rounded-sm border border-line-2 bg-card px-2 py-1 text-xs"
        >
          <option value="tout">Tout</option>
          <option value="paie">Paie</option>
          <option value="tresorerie">Trésorerie</option>
          <option value="personnel">Personnel</option>
        </select>
      }
    >
      <p className="mb-3 text-ink-2">
        Le contrat ne conserve aucun historique en mémoire : tout ce qui suit est
        reconstitué depuis les journaux d&apos;événements de la chaîne. C&apos;est
        cette trace, horodatée et infalsifiable, qui vaut preuve de paiement.
      </p>

      {isLoading ? (
        <Squelette lignes={8} />
      ) : isError ? (
        <Echec />
      ) : lignes.length === 0 ? (
        <Vide titre="Aucun événement">
          Rien à afficher pour ce filtre sur la profondeur de journaux consultée.
        </Vide>
      ) : (
        <Tableau>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Concerne</Th>
              <Th align="right">Montant</Th>
              <Th align="right">Transaction</Th>
              <Th align="right">Bulletin</Th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((e) => (
              <tr key={`${e.hash}-${e.logIndex}`}>
                <Td className="whitespace-nowrap font-mono text-ink-2">
                  {formatDateTime(e.date)}
                </Td>
                <Td>
                  <Etiquette ton={TON[e.type] ?? "neutre"}>
                    {LIBELLES[e.type]}
                  </Etiquette>
                </Td>
                <Td className="text-ink-2">
                  {e.type === "PayrollCompleted"
                    ? `${e.effectif} salariés`
                    : e.sujet
                      ? nomAffiche(fiches[e.sujet.toLowerCase()], e.sujet)
                      : "—"}
                </Td>
                <Td align="right" className="whitespace-nowrap font-mono">
                  {e.montant !== undefined ? formatToken(e.montant) : "—"}
                  {e.type === "SalaryUpdated" && e.ancienMontant !== undefined && (
                    <span className="ml-1 text-[11px] text-ink-3">
                      (avant {formatToken(e.ancienMontant, false)})
                    </span>
                  )}
                </Td>
                <Td align="right">
                  <LienTransaction hash={e.hash} />
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {e.type === "SalaryPaid" ? (
                    <>
                      <button
                        onClick={() =>
                          emettre({
                            adresse: e.sujet!,
                            montant: e.montant!,
                            date: e.date,
                            hash: e.hash,
                            logIndex: e.logIndex,
                          })
                        }
                        className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
                      >
                        Éditer
                      </button>
                      {emis.has(repere(e.hash, e.logIndex)) && (
                        <span
                          className="ml-2 text-[11px] text-ink-3"
                          title="Ce bulletin est inscrit au registre de paie."
                        >
                          inscrit
                        </span>
                      )}
                    </>
                  ) : e.type === "PayrollCompleted" ? (
                    <button
                      onClick={() => emettreCycle(e.hash)}
                      disabled={(cycles.get(e.hash.toLowerCase()) ?? []).length === 0}
                      className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2 disabled:opacity-40"
                      title="Éditer un bulletin pour chaque salarié payé dans ce cycle."
                    >
                      Tout le cycle
                    </button>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
    </Panneau>
  );
}
