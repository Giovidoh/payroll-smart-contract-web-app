"use client";

import {
  formatToken,
  formatCountdown,
  formatDateTime,
} from "@/lib/format";
import {
  Panneau,
  Bandeau,
  Tableau,
  Th,
  Td,
  Vide,
  Squelette,
  LienAdresse,
  LienTransaction,
} from "../ui-kit";
import { useSalaries, useTresorerie } from "../../hooks/use-payroll";
import { useEcheance } from "../../hooks/use-echeance";
import { useEvenements } from "../../hooks/use-events";
import { useFiches, nomAffiche } from "../../store/directory-store";
import type { Operation } from "../../hooks/use-transaction";

export default function ExecutionPaie({
  onDemander,
}: {
  onDemander: (o: Operation) => void;
}) {
  const { data: salaries, isLoading } = useSalaries();
  const { solde, masse } = useTresorerie({ estProprietaire: true });
  const { restant, echue, prochaine } = useEcheance();
  const { data: evenements } = useEvenements();
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
        <Squelette lignes={1} />
      ) : !echue ? (
        <Bandeau ton="warn" titre="Le garde-temps s'y oppose encore.">
          Le contrat rejettera toute exécution pendant{" "}
          {restant !== undefined ? formatCountdown(restant) : "…"} — jusqu&apos;au{" "}
          {prochaine !== undefined ? formatDateTime(prochaine) : "…"}.
        </Bandeau>
      ) : effectif === 0 ? (
        <Bandeau ton="warn" titre="Aucun bénéficiaire.">
          La liste des salariés est vide : une exécution ne verserait rien.
        </Bandeau>
      ) : !provisionne ? (
        <Bandeau ton="err" titre="Provision insuffisante.">
          Le contrat détient {solde !== undefined ? formatToken(solde) : "…"} pour une
          masse salariale de {masse !== undefined ? formatToken(masse) : "…"}. Le
          versement est atomique : il échouerait entièrement plutôt que partiellement.
        </Bandeau>
      ) : (
        <Bandeau ton="ok" titre="Tous les contrôles préalables sont satisfaits.">
          L&apos;échéance est passée, l&apos;effectif est non nul et la provision couvre
          la masse salariale.
        </Bandeau>
      )}

      <Panneau titre={`Bénéficiaires de cette exécution (${effectif})`}>
        {isLoading ? (
          <Squelette lignes={5} />
        ) : effectif === 0 ? (
          <Vide titre="Aucun salarié inscrit" />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Salarié</Th>
                <Th>Adresse</Th>
                <Th align="right">Montant</Th>
              </tr>
            </thead>
            <tbody>
              {salaries!.map((e) => (
                <tr key={e.employeeAddress}>
                  <Td className="font-medium">
                    {nomAffiche(fiches[e.employeeAddress.toLowerCase()], e.employeeAddress)}
                  </Td>
                  <Td>
                    <LienAdresse adresse={e.employeeAddress} />
                  </Td>
                  <Td align="right" className="whitespace-nowrap font-mono">
                    {formatToken(e.salary)}
                  </Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">Total versé</Td>
                <Td>{null}</Td>
                <Td align="right" className="font-mono font-semibold">
                  {masse !== undefined ? formatToken(masse) : "…"}
                </Td>
              </tr>
              <tr>
                <Td className="text-ink-2">Solde du contrat après opération</Td>
                <Td>{null}</Td>
                <Td align="right" className="font-mono text-ink-2">
                  {solde !== undefined && masse !== undefined
                    ? formatToken(solde - masse)
                    : "…"}
                </Td>
              </tr>
            </tbody>
          </Tableau>
        )}

        <button
          className="mt-4 w-full rounded-sm border border-primary bg-primary px-3.5 py-2.5 text-left font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
        </button>

        <p className="mt-2 text-[11px] text-ink-3">
          <code className="font-mono">runPayroll()</code> n&apos;est pas réservée au
          propriétaire : n&apos;importe quelle adresse peut la déclencher, y compris
          un salarié ou l&apos;ordonnanceur. Ce que le contrat garantit n&apos;est pas
          <em> qui</em> paie, mais que le versement est conforme.
        </p>
      </Panneau>

      <Panneau titre="Trois dernières exécutions">
        {cycles.length === 0 ? (
          <Vide titre="Aucune exécution observée">
            Aucun cycle de paie n&apos;apparaît dans les journaux consultés.
          </Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Bénéficiaires</Th>
                <Th align="right">Montant</Th>
                <Th align="right">Transaction</Th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={`${c.hash}-${c.logIndex}`}>
                  <Td className="whitespace-nowrap font-mono text-ink-2">
                    {formatDateTime(c.date)}
                  </Td>
                  <Td>{String(c.effectif)} salariés</Td>
                  <Td align="right" className="font-mono">
                    {c.montant !== undefined ? formatToken(c.montant) : "—"}
                  </Td>
                  <Td align="right">
                    <LienTransaction hash={c.hash} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Panneau>
    </>
  );
}
