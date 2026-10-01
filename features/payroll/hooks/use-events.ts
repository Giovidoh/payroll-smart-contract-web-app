"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbiItem, type Address, type Hash } from "viem";
import {
  CHAIN,
  DEPLOY_BLOCK,
  LOGS_RPC_URL,
  PAYROLL_ADDRESS,
} from "@/lib/contracts/config";

/**
 * Le contrat ne conserve aucun historique : il n'y a ni tableau des versements
 * passés, ni compteur de cycles. Tout l'historique du mémoire est reconstitué
 * depuis les journaux d'événements, qui sont la seule trace durable — et, du
 * point de vue du chapitre 6, la pièce probatoire opposable.
 */
export type EventType =
  | "NewEmployeeAdded"
  | "EmployeeRemoved"
  | "SalaryUpdated"
  | "FundsDeposited"
  | "AmountWithdrawn"
  | "SalaryPaid"
  | "PayrollCompleted";

export type PayrollEvent = {
  type: EventType;
  /** Horodatage du bloc, en secondes. */
  date: bigint;
  blockNumber: bigint;
  hash: Hash;
  logIndex: number;
  /** Adresse concernée, quand l'événement en désigne une. */
  subject?: Address;
  /** Montant en jeu, quand il y en a un. */
  amount?: bigint;
  /** Ancien salaire, pour SalaryUpdated. */
  previousAmount?: bigint;
  /** Nombre de salariés payés, pour PayrollCompleted. */
  headcount?: bigint;
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
 * Les points d'accès limitent l'étendue d'un `eth_getLogs`. Le plafond n'est pas
 * le même partout — mille blocs chez thirdweb, dix mille ou davantage chez un
 * fournisseur nominatif — et le dépassement se solde par un refus, non par une
 * réponse tronquée. On s'aligne donc sur le plus bas par défaut, quitte à le
 * relever par configuration quand le point d'accès le permet.
 */
const CHUNK = BigInt(process.env.NEXT_PUBLIC_LOG_RANGE ?? "1000");

/**
 * Cent trente tranches lancées de front feraient refuser l'ensemble pour excès
 * de débit. On les fait passer par un nombre borné de fronts simultanés.
 */
const CONCURRENCY = 8;

async function inParallel<T, R>(
  items: readonly T[],
  concurrency: number,
  handle: (e: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) {
        results[i] = await handle(items[i]);
      }
    })
  );
  return results;
}

/**
 * Faute de bloc de création configuré, on remonte une profondeur arbitraire.
 * C'est le repli, pas le régime normal : voir `DEPLOY_BLOCK`.
 */
const DEPTH = 450_000n;

/**
 * Le balayage initial coûte une requête par tranche, et il y a d'autant plus de
 * tranches que le contrat est ancien. Le refaire toutes les vingt secondes
 * saturerait n'importe quel point d'accès. On ne le fait donc qu'une fois par
 * session : ensuite, seuls les blocs parus depuis la dernière lecture sont
 * interrogés, ce qui ramène le régime de croisière à une tranche.
 */
const CACHE = new Map<Address, { until: bigint; events: PayrollEvent[] }>();

/*
 * Les journaux ne passent pas par le client de wagmi : ils ont leur propre point
 * d'accès, choisi pour l'étendue qu'il accepte. Le client est construit une fois
 * pour toutes, hors du rendu.
 */
const logsClient = createPublicClient({
  chain: CHAIN,
  transport: http(LOGS_RPC_URL),
});

export function useEvents() {
  return useQuery({
    queryKey: ["events", PAYROLL_ADDRESS],
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<PayrollEvent[]> => {
      const client = logsClient;
      const head = await client.getBlockNumber();
      const settled = CACHE.get(PAYROLL_ADDRESS);
      const fromBlock =
        DEPLOY_BLOCK > 0n
          ? DEPLOY_BLOCK
          : head > DEPTH
            ? head - DEPTH
            : 0n;
      const floor = settled ? settled.until + 1n : fromBlock;

      /*
       * Les tranches sont indépendantes : on les lance par fronts plutôt que
       * l'une après l'autre. Et une seule requête suffit par tranche — viem
       * pose un filtre portant les sept signatures à la fois, là où l'ancienne
       * version en faisait une par signature.
       */
      const windows: Array<{ start: bigint; end: bigint }> = [];
      for (let end = head; end >= floor; ) {
        const start = end > floor + CHUNK ? end - CHUNK : floor;
        windows.push({ start, end });
        if (start === floor) break;
        end = start - 1n;
      }

      const rawItems: PayrollEvent[] = [];

      /*
       * L'échec n'est plus avalé. Une tranche refusée — plafond dépassé, débit
       * excessif, point d'accès indisponible — faisait auparavant renvoyer une
       * liste vide, et l'écran annonçait « aucun événement » là où il fallait
       * lire « je n'ai pas pu lire ». S'agissant de la seule trace probatoire
       * des versements, une absence feinte est pire qu'une erreur affichée.
       */
      const chunks = await inParallel(windows, CONCURRENCY, ({ start, end }) =>
        client.getLogs({
          address: PAYROLL_ADDRESS,
          events: SIGNATURES,
          fromBlock: start,
          toBlock: end,
        })
      );

      for (const chunk of chunks) {
        for (const log of chunk) {
          const a = log.args as Record<string, unknown>;
          rawItems.push({
            type: log.eventName as EventType,
            date: a.timestamp as bigint,
            blockNumber: log.blockNumber,
            hash: log.transactionHash,
            logIndex: log.logIndex,
            subject: (a.employee ?? a.owner) as Address | undefined,
            amount: (a.salary ?? a.amount ?? a.newSalary ?? a.totalAmountPaid) as
              | bigint
              | undefined,
            previousAmount: a.oldSalary as bigint | undefined,
            headcount: a.numberOfEmployeesPaid as bigint | undefined,
          });
        }
      }

      const all = [...(settled?.events ?? []), ...rawItems];
      CACHE.set(PAYROLL_ADDRESS, { until: head, events: all });

      // Du plus récent au plus ancien, départage par position dans le bloc.
      return [...all].sort((x, y) =>
        x.blockNumber === y.blockNumber
          ? y.logIndex - x.logIndex
          : Number(y.blockNumber - x.blockNumber)
      );
    },
  });
}

export const LABELS: Record<EventType, string> = {
  NewEmployeeAdded: "Salarié ajouté",
  EmployeeRemoved: "Salarié retiré",
  SalaryUpdated: "Salaire modifié",
  FundsDeposited: "Provision déposée",
  AmountWithdrawn: "Retrait",
  SalaryPaid: "Salaire versé",
  PayrollCompleted: "Paie exécutée",
};
