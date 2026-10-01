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

const token = { abi: erc20Abi, address: TOKEN_ADDRESS, chainId: CHAIN.id } as const;

/** Rafraîchissement : la chaîne bouge sans nous prévenir. */
const STANDBY = { query: { refetchInterval: 12_000 } } as const;

export function useOwner() {
  return useReadContract({ ...payroll, functionName: "owner", ...STANDBY });
}

/**
 * Rôle de l'adresse connectée, déduit de la chaîne et non d'un choix d'interface.
 * `inconnu` : connecté, mais ni propriétaire ni salarié — l'employeur ne l'a pas
 * encore inscrit.
 */
export type Role = "employer" | "employee" | "unknown";

export function useRole(): { role: Role | undefined; busy: boolean } {
  const { address } = useAccount();
  const { data: owner, isLoading: l1 } = useOwner();

  const isOwner =
    Boolean(owner) && Boolean(address) && address!.toLowerCase() === owner!.toLowerCase();

  /*
   * `getEmployeeExistence()` serait le candidat naturel, mais elle est
   * `onlyOwner` : un salarié qui l'appelle reçoit un refus, et serait donc
   * classé « inconnu ». On interroge `getEmployee(moi)`, qui accepte
   * précisément l'intéressé : elle aboutit s'il est salarié et rejette avec
   * `Payroll__EmployeeDoesNotExist` sinon.
   */
  const activeRecord = Boolean(address) && !isOwner;

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
      enabled: activeRecord,
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
  const alreadyRejected = m2 > 0;

  if (!address) return { role: undefined, busy: false };
  if (l1) return { role: undefined, busy: true };
  if (isOwner) return { role: "employer", busy: false };
  if (isSuccess) return { role: "employee", busy: false };
  if (isError || alreadyRejected) return { role: "unknown", busy: false };
  return { role: undefined, busy: l2 || activeRecord };
}

/** Paramètres immuables du contrat : intervalle et nombre de cycles réservés. */
export function useSettings() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...payroll, functionName: "getPayrollInterval" },
      { ...payroll, functionName: "getReservedPayrollCycles" },
      { ...payroll, functionName: "getLastPayrollTimestamp" },
    ],
    query: { refetchInterval: 12_000 },
  });

  return {
    busy: isLoading,
    interval: data?.[0]?.result as bigint | undefined,
    reservedCycles: data?.[1]?.result as bigint | undefined,
    lastPayroll: data?.[2]?.result as bigint | undefined,
  };
}

/**
 * Trésorerie. `getTotalSalaries()` est `onlyOwner` : appelée par un salarié elle
 * *revert*, elle ne renvoie pas zéro. On ne l'interroge donc que si l'appelant
 * est le propriétaire, sinon l'appel échoue et pollue l'interface d'une erreur
 * qui n'en est pas une.
 */
export function useTreasury({ isOwner }: { isOwner: boolean }) {
  const { address } = useAccount();
  const active = isOwner && Boolean(address);

  const standby = { enabled: active, retry: false, refetchInterval: 12_000 } as const;

  const { data: balance, isLoading: c1, refetch } = useReadContract({
    ...token,
    functionName: "balanceOf",
    args: [PAYROLL_ADDRESS],
    query: { enabled: active, refetchInterval: 12_000 },
  });

  const { data: surplus, isLoading: c2 } = useReadContract({
    ...payroll,
    functionName: "getAvailableAmountForWithdrawal",
    account: address,
    query: standby,
  });

  const { data: payrollTotal, isLoading: c3 } = useReadContract({
    ...payroll,
    functionName: "getTotalSalaries",
    account: address,
    query: standby,
  });

  return {
    busy: c1 || c2 || c3,
    refetch,
    balance,
    surplus,
    payrollTotal,
    /** Part immobilisée par la réserve de cycles, non retirable par l'employeur. */
    reserve:
      balance !== undefined && surplus !== undefined ? balance - surplus : undefined,
  };
}

/**
 * Liste des salariés. `getAllEmployees()` est `onlyOwner` : elle *revert* pour
 * toute autre adresse. Réservée donc aux écrans de l'employeur.
 */
export function useEmployees({ active = true }: { active?: boolean } = {}) {
  const { address } = useAccount();
  return useReadContract({
    ...payroll,
    functionName: "getAllEmployees",
    account: address,
    query: {
      enabled: active && Boolean(address),
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
export function useEmployee(address: Address | undefined) {
  const { address: caller } = useAccount();
  return useReadContract({
    ...payroll,
    functionName: "getEmployee",
    args: address ? [address] : undefined,
    account: caller,
    query: {
      enabled: Boolean(address) && Boolean(caller),
      retry: false,
      refetchInterval: 12_000,
    },
  });
}

/** Solde du jeton détenu par une adresse quelconque (l'employeur, par exemple). */
export function useTokenBalance(address: Address | undefined) {
  return useReadContract({
    ...token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });
}

/** Autorisation accordée par l'employeur au contrat pour prélever le jeton. */
export function useAllowance(readOwner: Address | undefined) {
  return useReadContract({
    ...token,
    functionName: "allowance",
    args: readOwner ? [readOwner, PAYROLL_ADDRESS] : undefined,
    query: { enabled: Boolean(readOwner), refetchInterval: 12_000 },
  });
}
