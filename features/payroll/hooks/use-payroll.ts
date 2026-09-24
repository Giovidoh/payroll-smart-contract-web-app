"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { CHAIN, PAYROLL_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts/config";

/*
 * `chainId` est épinglé sur chaque lecture. Sans lui, wagmi interroge le réseau
 * courant du portefeuille : une adresse restée sur un autre réseau lirait une
 * adresse qui n'y porte aucun code, et le rôle en serait faussé.
 */
const payroll = {
  abi: payrollAbi,
  address: PAYROLL_ADDRESS,
  chainId: CHAIN.id,
} as const;

const jeton = { abi: erc20Abi, address: TOKEN_ADDRESS, chainId: CHAIN.id } as const;

/** Rafraîchissement : la chaîne bouge sans nous prévenir. */
const VEILLE = { query: { refetchInterval: 12_000 } } as const;

export function useOwner() {
  return useReadContract({ ...payroll, functionName: "owner", ...VEILLE });
}

/**
 * Rôle de l'adresse connectée, déduit de la chaîne et non d'un choix d'interface.
 * `inconnu` : connecté, mais ni propriétaire ni salarié — l'employeur ne l'a pas
 * encore inscrit.
 */
export type Role = "employeur" | "salarie" | "inconnu";

export function useRole(): { role: Role | undefined; enCours: boolean } {
  const { address } = useAccount();
  const { data: owner, isLoading: l1 } = useOwner();

  const estProprietaire =
    Boolean(owner) && Boolean(address) && address!.toLowerCase() === owner!.toLowerCase();

  /*
   * `getEmployeeExistence()` serait le candidat naturel, mais elle est
   * `onlyOwner` : un salarié qui l'appelle reçoit un refus, et serait donc
   * classé « inconnu ». On interroge `getEmployee(moi)`, qui accepte
   * précisément l'intéressé : elle aboutit s'il est salarié et rejette avec
   * `Payroll__EmployeeDoesNotExist` sinon.
   */
  const ficheActive = Boolean(address) && !estProprietaire;

  const {
    isSuccess,
    isError,
    isLoading: l2,
    errorUpdateCount: m2,
  } = useReadContract({
    ...payroll,
    functionName: "getEmployee",
    args: address ? [address] : undefined,
    /*
     * `account` renseigne le champ `from` de l'`eth_call`. Sans lui, le contrat
     * voit `msg.sender = 0x0` et sa garde — « ni le propriétaire, ni
     * l'intéressé » — refuse tout le monde, y compris le salarié qui demande
     * sa propre fiche. Une lecture n'a pas d'expéditeur par nature : il faut le
     * déclarer explicitement dès que la fonction lue en dépend.
     */
    account: address,
    query: {
      enabled: ficheActive,
      retry: false,
      refetchInterval: 12_000,
    },
  });

  /*
   * `isLoading` ne suffit pas à décider. Une requête qui n'a jamais abouti
   * repasse par l'état « en attente » à chaque nouvelle tentative, l'erreur
   * précédente étant effacée : s'y fier ferait patienter indéfiniment devant
   * une lecture qui, elle, a déjà répondu — par un refus. `errorUpdateCount`
   * garde la mémoire de ces refus, là où `isError` ne vaut que dans l'intervalle
   * entre deux tentatives.
   */
  const dejaRefusee = m2 > 0;

  if (!address) return { role: undefined, enCours: false };
  if (l1) return { role: undefined, enCours: true };
  if (estProprietaire) return { role: "employeur", enCours: false };
  if (isSuccess) return { role: "salarie", enCours: false };
  if (isError || dejaRefusee) return { role: "inconnu", enCours: false };
  return { role: undefined, enCours: l2 || ficheActive };
}

/** Paramètres immuables du contrat : intervalle et nombre de cycles réservés. */
export function useParametres() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...payroll, functionName: "getPayrollInterval" },
      { ...payroll, functionName: "getReservedPayrollCycles" },
      { ...payroll, functionName: "getLastPayrollTimestamp" },
    ],
    query: { refetchInterval: 12_000 },
  });

  return {
    enCours: isLoading,
    intervalle: data?.[0]?.result as bigint | undefined,
    cyclesReserves: data?.[1]?.result as bigint | undefined,
    dernierePaie: data?.[2]?.result as bigint | undefined,
  };
}

/**
 * Trésorerie. `getTotalSalaries()` est `onlyOwner` : appelée par un salarié elle
 * *revert*, elle ne renvoie pas zéro. On ne l'interroge donc que si l'appelant
 * est le propriétaire, sinon l'appel échoue et pollue l'interface d'une erreur
 * qui n'en est pas une.
 */
export function useTresorerie({ estProprietaire }: { estProprietaire: boolean }) {
  const { address } = useAccount();
  const actif = estProprietaire && Boolean(address);

  const veille = { enabled: actif, retry: false, refetchInterval: 12_000 } as const;

  const { data: solde, isLoading: c1, refetch } = useReadContract({
    ...jeton,
    functionName: "balanceOf",
    args: [PAYROLL_ADDRESS],
    query: { enabled: actif, refetchInterval: 12_000 },
  });

  const { data: surplus, isLoading: c2 } = useReadContract({
    ...payroll,
    functionName: "getAvailableAmountForWithdrawal",
    account: address,
    query: veille,
  });

  const { data: masse, isLoading: c3 } = useReadContract({
    ...payroll,
    functionName: "getTotalSalaries",
    account: address,
    query: veille,
  });

  return {
    enCours: c1 || c2 || c3,
    refetch,
    solde,
    surplus,
    masse,
    /** Part immobilisée par la réserve de cycles, non retirable par l'employeur. */
    reserve:
      solde !== undefined && surplus !== undefined ? solde - surplus : undefined,
  };
}

/**
 * Liste des salariés. `getAllEmployees()` est `onlyOwner` : elle *revert* pour
 * toute autre adresse. Réservée donc aux écrans de l'employeur.
 */
export function useSalaries({ actif = true }: { actif?: boolean } = {}) {
  const { address } = useAccount();
  return useReadContract({
    ...payroll,
    functionName: "getAllEmployees",
    account: address,
    query: {
      enabled: actif && Boolean(address),
      retry: false,
      refetchInterval: 12_000,
    },
  });
}

/**
 * Fiche d'un salarié. Gardée : seuls le propriétaire et l'intéressé y accèdent.
 * L'appel porte donc le `from` de l'adresse connectée, sans quoi le contrat le
 * rejette quelle que soit la fiche demandée.
 */
export function useSalarie(address: Address | undefined) {
  const { address: appelant } = useAccount();
  return useReadContract({
    ...payroll,
    functionName: "getEmployee",
    args: address ? [address] : undefined,
    account: appelant,
    query: {
      enabled: Boolean(address) && Boolean(appelant),
      retry: false,
      refetchInterval: 12_000,
    },
  });
}

/** Solde du jeton détenu par une adresse quelconque (l'employeur, par exemple). */
export function useSoldeJeton(address: Address | undefined) {
  return useReadContract({
    ...jeton,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });
}

/** Autorisation accordée par l'employeur au contrat pour prélever le jeton. */
export function useAutorisation(proprietaire: Address | undefined) {
  return useReadContract({
    ...jeton,
    functionName: "allowance",
    args: proprietaire ? [proprietaire, PAYROLL_ADDRESS] : undefined,
    query: { enabled: Boolean(proprietaire), refetchInterval: 12_000 },
  });
}
