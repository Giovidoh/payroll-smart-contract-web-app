"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import {
  formatToken,
  formatCountdown,
  formatDateTime,
  formatInterval,
} from "@/lib/format";
import {
  Panneau,
  Kpi,
  Bandeau,
  Etiquette,
  Tableau,
  Th,
  Td,
  Vide,
  Squelette,
  LienTransaction,
} from "../ui-kit";
import { useSalaries, useTresorerie } from "../../hooks/use-payroll";
import { useEcheance } from "../../hooks/use-echeance";
import { useEvenements, LIBELLES, type Evenement } from "../../hooks/use-events";
import { useFiches, nomAffiche, type FicheSalarie } from "../../store/directory-store";
import type { Ecran } from "../AppShell";

const TON: Record<string, "ok" | "warn" | "accent" | "neutre"> = {
  PayrollCompleted: "ok",
  SalaryPaid: "ok",
  FundsDeposited: "accent",
  EmployeeRemoved: "warn",
  AmountWithdrawn: "warn",
};

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
  const { data: evenements, isLoading } = useEvenements();
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
          <Bandeau ton="ok" titre="La paie est exécutable.">
            Le garde-temps ne s&apos;y oppose plus et la provision couvre la masse
            salariale.
          </Bandeau>
        ) : (
          <Bandeau ton="err" titre="La paie est due mais la provision est insuffisante.">
            Approvisionnez le contrat avant de l&apos;exécuter.
          </Bandeau>
        )
      ) : (
        <Bandeau ton="neutre" titre="Paie non encore exigible.">
          Le contrat refusera toute exécution avant l&apos;échéance.
        </Bandeau>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Effectif inscrit"
          valeur={effectif}
          indice={effectif === 0 ? "Aucun salarié" : "salariés en chaîne"}
        />
        <Kpi
          label="Masse salariale"
          valeur={masse !== undefined ? formatToken(masse, false) : "…"}
          indice="par cycle"
        />
        <Kpi
          label="Solde du contrat"
          valeur={solde !== undefined ? formatToken(solde, false) : "…"}
          indice={
            provisionSuffisante === undefined
              ? undefined
              : provisionSuffisante
                ? "provision suffisante"
                : "provision insuffisante"
          }
        />
        <Kpi
          label="Surplus retirable"
          valeur={surplus !== undefined ? formatToken(surplus, false) : "…"}
          indice={
            cyclesReserves !== undefined
              ? `${cyclesReserves} cycles immobilisés`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Prochaine paie">
          <div className="font-mono text-[28px] font-medium tracking-[-0.02em]">
            {restant === undefined
              ? "…"
              : (formatCountdown(restant) ?? "exécutable maintenant")}
          </div>
          <p className="mt-1.5 text-ink-2">
            {prochaine !== undefined && intervalle !== undefined && (
              <>
                Éligible le {formatDateTime(prochaine)} · intervalle de{" "}
                {formatInterval(intervalle)}
              </>
            )}
          </p>

          <div className="mt-4 grid gap-1.5 border-t border-line pt-3">
            <div className="flex justify-between">
              <span className="text-ink-2">Dernière paie</span>
              <span className="font-mono">
                {dernierePaie ? formatDateTime(dernierePaie) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Dernier cycle observé</span>
              <span className="font-mono">
                {dernierCycle
                  ? `${dernierCycle.effectif} salariés · ${formatToken(dernierCycle.montant!)}`
                  : "aucun"}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNaviguer("B7")}
            className="mt-4 w-full rounded-sm border border-primary bg-primary px-3 py-2.5 text-left font-medium text-primary-foreground hover:bg-primary/90"
          >
            Préparer l&apos;exécution de la paie
          </button>
        </Panneau>

        <Panneau
          titre="Trésorerie"
          action={
            <button
              onClick={() => onNaviguer("B6")}
              className="rounded-sm border border-line-2 bg-card px-2 py-1 text-xs hover:bg-surface-2"
            >
              Gérer
            </button>
          }
        >
          <BarreTresorerie solde={solde} reserve={reserve} surplus={surplus} />
        </Panneau>
      </div>

      <Panneau
        titre="Événements récents"
        action={
          <button
            onClick={() => onNaviguer("B8")}
            className="rounded-sm border border-line-2 bg-card px-2 py-1 text-xs hover:bg-surface-2"
          >
            Tout l&apos;historique
          </button>
        }
      >
        {isLoading ? (
          <Squelette />
        ) : recents.length === 0 ? (
          <Vide titre="Aucun événement">
            Le contrat n&apos;a encore rien enregistré, ou les journaux consultés ne
            remontent pas jusqu&apos;à son déploiement.
          </Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Détail</Th>
                <Th align="right">Montant</Th>
              </tr>
            </thead>
            <tbody>
              {recents.map((e) => (
                <LigneEvenement key={`${e.hash}-${e.logIndex}`} e={e} fiches={fiches} />
              ))}
            </tbody>
          </Tableau>
        )}
      </Panneau>
    </>
  );
}

function LigneEvenement({
  e,
  fiches,
}: {
  e: Evenement;
  fiches: Record<string, FicheSalarie>;
}) {
  const detail =
    e.type === "PayrollCompleted"
      ? `${e.effectif} salariés payés`
      : e.sujet
        ? nomAffiche(fiches[e.sujet.toLowerCase()], e.sujet)
        : "—";

  return (
    <tr>
      <Td className="whitespace-nowrap font-mono text-ink-2">
        {formatDateTime(e.date)}
      </Td>
      <Td>
        <Etiquette ton={TON[e.type] ?? "neutre"}>{LIBELLES[e.type]}</Etiquette>
      </Td>
      <Td className="text-ink-2">{detail}</Td>
      <Td align="right" className="whitespace-nowrap font-mono">
        {e.montant !== undefined ? formatToken(e.montant) : "—"}
      </Td>
    </tr>
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
    return <Squelette lignes={3} />;
  }

  const total = solde === 0n ? 1n : solde;
  const pctReserve = Number((reserve * 100n) / total);

  return (
    <>
      <div className="flex h-3 w-full overflow-hidden border border-line-2">
        <div className="bg-primary" style={{ width: `${pctReserve}%` }} />
        <div className="flex-1 bg-surface-3" />
      </div>

      <div className="mt-3 grid gap-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="inline-block size-2.5 bg-primary" />
            Réserve immobilisée
          </span>
          <span className="font-mono">{formatToken(reserve)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="inline-block size-2.5 border border-line-2 bg-surface-3" />
            Surplus retirable
          </span>
          <span className="font-mono">{formatToken(surplus)}</span>
        </div>
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
          <span>Solde total</span>
          <span className="font-mono">{formatToken(solde)}</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-3">
        La réserve n&apos;est pas une écriture comptable : le contrat refuse
        matériellement tout retrait qui l&apos;entamerait, y compris au propriétaire.
      </p>
    </>
  );
}
