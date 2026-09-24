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
 * Les points d'accès limitent l'étendue d'un `eth_getLogs`. Le plafond n'est pas
 * le même partout — mille blocs chez thirdweb, dix mille ou davantage chez un
 * fournisseur nominatif — et le dépassement se solde par un refus, non par une
 * réponse tronquée. On s'aligne donc sur le plus bas par défaut, quitte à le
 * relever par configuration quand le point d'accès le permet.
 */
const TRANCHE = BigInt(process.env.NEXT_PUBLIC_LOG_RANGE ?? "1000");

/**
 * Cent trente tranches lancées de front feraient refuser l'ensemble pour excès
 * de débit. On les fait passer par un nombre borné de fronts simultanés.
 */
const FRONTS = 8;

async function enParallele<T, R>(
  elements: readonly T[],
  fronts: number,
  traiter: (e: T) => Promise<R>
): Promise<R[]> {
  const resultats: R[] = new Array(elements.length);
  let suivant = 0;
  await Promise.all(
    Array.from({ length: Math.min(fronts, elements.length) }, async () => {
      for (let i = suivant++; i < elements.length; i = suivant++) {
        resultats[i] = await traiter(elements[i]);
      }
    })
  );
  return resultats;
}

/**
 * Faute de bloc de création configuré, on remonte une profondeur arbitraire.
 * C'est le repli, pas le régime normal : voir `DEPLOY_BLOCK`.
 */
const PROFONDEUR = 450_000n;

/**
 * Le balayage initial coûte une requête par tranche, et il y a d'autant plus de
 * tranches que le contrat est ancien. Le refaire toutes les vingt secondes
 * saturerait n'importe quel point d'accès. On ne le fait donc qu'une fois par
 * session : ensuite, seuls les blocs parus depuis la dernière lecture sont
 * interrogés, ce qui ramène le régime de croisière à une tranche.
 */
const CACHE = new Map<Address, { jusqua: bigint; evenements: Evenement[] }>();

/*
 * Les journaux ne passent pas par le client de wagmi : ils ont leur propre point
 * d'accès, choisi pour l'étendue qu'il accepte. Le client est construit une fois
 * pour toutes, hors du rendu.
 */
const clientJournaux = createPublicClient({
  chain: CHAIN,
  transport: http(LOGS_RPC_URL),
});

export function useEvenements() {
  return useQuery({
    queryKey: ["evenements", PAYROLL_ADDRESS],
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Evenement[]> => {
      const client = clientJournaux;
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
       * Les tranches sont indépendantes : on les lance par fronts plutôt que
       * l'une après l'autre. Et une seule requête suffit par tranche — viem
       * pose un filtre portant les sept signatures à la fois, là où l'ancienne
       * version en faisait une par signature.
       */
      const fenetres: Array<{ debut: bigint; fin: bigint }> = [];
      for (let fin = tete; fin >= plancher; ) {
        const debut = fin > plancher + TRANCHE ? fin - TRANCHE : plancher;
        fenetres.push({ debut, fin });
        if (debut === plancher) break;
        fin = debut - 1n;
      }

      const bruts: Evenement[] = [];

      /*
       * L'échec n'est plus avalé. Une tranche refusée — plafond dépassé, débit
       * excessif, point d'accès indisponible — faisait auparavant renvoyer une
       * liste vide, et l'écran annonçait « aucun événement » là où il fallait
       * lire « je n'ai pas pu lire ». S'agissant de la seule trace probatoire
       * des versements, une absence feinte est pire qu'une erreur affichée.
       */
      const lots = await enParallele(fenetres, FRONTS, ({ debut, fin }) =>
        client.getLogs({
          address: PAYROLL_ADDRESS,
          events: SIGNATURES,
          fromBlock: debut,
          toBlock: fin,
        })
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
