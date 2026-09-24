"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseAbiItem, type Address, type Hash } from "viem";
import { PAYROLL_ADDRESS } from "@/lib/contracts/config";

/**
 * Le contrat ne conserve aucun historique : il n'y a ni tableau des versements
 * passés, ni compteur de cycles. Tout l'historique du mémoire est reconstitué
 * depuis les journaux d'événements, qui sont la seule trace durable — et, du
 * point de vue du chapitre 6, la pièce probatoire opposable.
 */
export type TypeEvenement =
  | "NewEmployeeAdded"
  | "EmployeeRemoved"
  | "SalaryUpdated"
  | "FundsDeposited"
  | "AmountWithdrawn"
  | "SalaryPaid"
  | "PayrollCompleted";

export type Evenement = {
  type: TypeEvenement;
  /** Horodatage du bloc, en secondes. */
  date: bigint;
  blockNumber: bigint;
  hash: Hash;
  logIndex: number;
  /** Adresse concernée, quand l'événement en désigne une. */
  sujet?: Address;
  /** Montant en jeu, quand il y en a un. */
  montant?: bigint;
  /** Ancien salaire, pour SalaryUpdated. */
  ancienMontant?: bigint;
  /** Nombre de salariés payés, pour PayrollCompleted. */
  effectif?: bigint;
};

const SIGNATURES = [
  parseAbiItem(
    "event NewEmployeeAdded(address indexed employee, uint256 salary, uint256 timestamp)"
  ),
  parseAbiItem(
    "event EmployeeRemoved(address indexed employee, uint256 timestamp)"
  ),
  parseAbiItem(
    "event SalaryUpdated(address indexed employee, uint256 newSalary, uint256 oldSalary, uint256 timestamp)"
  ),
  parseAbiItem(
    "event FundsDeposited(address indexed owner, uint256 amount, uint256 timestamp)"
  ),
  parseAbiItem(
    "event AmountWithdrawn(address indexed owner, uint256 amount, uint256 timestamp)"
  ),
  parseAbiItem(
    "event SalaryPaid(address indexed employee, uint256 salary, uint256 timestamp)"
  ),
  parseAbiItem(
    "event PayrollCompleted(uint256 numberOfEmployeesPaid, uint256 totalAmountPaid, uint256 timestamp)"
  ),
] as const;

/**
 * Les points d'accès publics limitent l'étendue d'un `eth_getLogs`. On interroge
 * donc par tranches en remontant depuis la tête de chaîne, ce qui suffit
 * largement à la durée de vie d'un déploiement de démonstration.
 */
const TRANCHE = 45_000n;
const PROFONDEUR = 450_000n;

export function useEvenements() {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["evenements", PAYROLL_ADDRESS],
    enabled: Boolean(client),
    refetchInterval: 20_000,
    queryFn: async (): Promise<Evenement[]> => {
      if (!client) return [];

      const tete = await client.getBlockNumber();
      const plancher = tete > PROFONDEUR ? tete - PROFONDEUR : 0n;

      const bruts: Evenement[] = [];

      for (let fin = tete; fin > plancher; ) {
        const debut = fin > plancher + TRANCHE ? fin - TRANCHE : plancher;

        const lots = await Promise.all(
          SIGNATURES.map((event) =>
            client
              .getLogs({
                address: PAYROLL_ADDRESS,
                event,
                fromBlock: debut,
                toBlock: fin,
              })
              .catch(() => [])
          )
        );

        for (const lot of lots) {
          for (const log of lot) {
            const a = log.args as Record<string, unknown>;
            bruts.push({
              type: log.eventName as TypeEvenement,
              date: a.timestamp as bigint,
              blockNumber: log.blockNumber,
              hash: log.transactionHash,
              logIndex: log.logIndex,
              sujet: (a.employee ?? a.owner) as Address | undefined,
              montant: (a.salary ?? a.amount ?? a.newSalary ?? a.totalAmountPaid) as
                | bigint
                | undefined,
              ancienMontant: a.oldSalary as bigint | undefined,
              effectif: a.numberOfEmployeesPaid as bigint | undefined,
            });
          }
        }

        if (debut === plancher) break;
        fin = debut - 1n;
      }

      // Du plus récent au plus ancien, départage par position dans le bloc.
      return bruts.sort((x, y) =>
        x.blockNumber === y.blockNumber
          ? y.logIndex - x.logIndex
          : Number(y.blockNumber - x.blockNumber)
      );
    },
  });
}

export const LIBELLES: Record<TypeEvenement, string> = {
  NewEmployeeAdded: "Salarié ajouté",
  EmployeeRemoved: "Salarié retiré",
  SalaryUpdated: "Salaire modifié",
  FundsDeposited: "Provision déposée",
  AmountWithdrawn: "Retrait",
  SalaryPaid: "Salaire versé",
  PayrollCompleted: "Paie exécutée",
};
