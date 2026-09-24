"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseAbiItem, type Address, type Hash } from "viem";
import { CHAIN, DEPLOY_BLOCK, PAYROLL_ADDRESS } from "@/lib/contracts/config";

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
 * Les points d'accès publics limitent l'étendue d'un `eth_getLogs`. On découpe
 * donc l'intervalle à lire en tranches de cette taille.
 */
const TRANCHE = 45_000n;

/**
 * Faute de bloc de création configuré, on remonte une profondeur arbitraire.
 * C'est le repli, pas le régime normal : voir `DEPLOY_BLOCK`.
 */
const PROFONDEUR = 450_000n;

/**
 * Le balayage initial coûte sept `eth_getLogs` par tranche. Le refaire toutes
 * les vingt secondes saturerait n'importe quel point d'accès public. On ne le
 * fait donc qu'une fois par session : ensuite, seuls les blocs parus depuis la
 * dernière lecture sont interrogés, ce qui ramène le régime de croisière à une
 * tranche.
 */
const CACHE = new Map<Address, { jusqua: bigint; evenements: Evenement[] }>();

export function useEvenements() {
  const client = usePublicClient({ chainId: CHAIN.id });

  return useQuery({
    queryKey: ["evenements", PAYROLL_ADDRESS],
    enabled: Boolean(client),
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Evenement[]> => {
      if (!client) return [];

      const tete = await client.getBlockNumber();
      const acquis = CACHE.get(PAYROLL_ADDRESS);
      const origine =
        DEPLOY_BLOCK > 0n
          ? DEPLOY_BLOCK
          : tete > PROFONDEUR
            ? tete - PROFONDEUR
            : 0n;
      const plancher = acquis ? acquis.jusqua + 1n : origine;

      /*
       * Les tranches étaient interrogées l'une après l'autre : chaque aller-retour
       * réseau attendait le précédent, et le premier chargement durait autant de
       * fois la latence qu'il y avait de tranches. Comme elles sont indépendantes,
       * on les lance de front — le nombre de requêtes est inchangé, seul le temps
       * d'attente l'est.
       */
      const fenetres: Array<{ debut: bigint; fin: bigint }> = [];
      for (let fin = tete; fin >= plancher; ) {
        const debut = fin > plancher + TRANCHE ? fin - TRANCHE : plancher;
        fenetres.push({ debut, fin });
        if (debut === plancher) break;
        fin = debut - 1n;
      }

      const bruts: Evenement[] = [];

      const lots = await Promise.all(
        fenetres.flatMap(({ debut, fin }) =>
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

      const tout = [...(acquis?.evenements ?? []), ...bruts];
      CACHE.set(PAYROLL_ADDRESS, { jusqua: tete, evenements: tout });

      // Du plus récent au plus ancien, départage par position dans le bloc.
      return [...tout].sort((x, y) =>
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
