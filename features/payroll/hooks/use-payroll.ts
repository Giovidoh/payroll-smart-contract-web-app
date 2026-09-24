"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { PAYROLL_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts/config";

const payroll = { abi: payrollAbi, address: PAYROLL_ADDRESS } as const;

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
  const { isSuccess, isError, isLoading: l2 } = useReadContract({
    ...payroll,
    functionName: "getEmployee",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && !estProprietaire,
      retry: false,
      refetchInterval: 12_000,
    },
  });

  if (!address) return { role: undefined, enCours: false };
  if (l1) return { role: undefined, enCours: true };
  if (estProprietaire) return { role: "employeur", enCours: false };
  if (l2) return { role: undefined, enCours: true };
  if (isSuccess) return { role: "salarie", enCours: false };
  if (isError) return { role: "inconnu", enCours: false };
  return { role: undefined, enCours: true };
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
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        abi: erc20Abi,
        address: TOKEN_ADDRESS,
        functionName: "balanceOf",
        args: [PAYROLL_ADDRESS],
      },
      { ...payroll, functionName: "getAvailableAmountForWithdrawal" },
      { ...payroll, functionName: "getTotalSalaries" },
    ],
    query: { enabled: estProprietaire, refetchInterval: 12_000 },
  });

  const solde = data?.[0]?.result as bigint | undefined;
  const surplus = data?.[1]?.result as bigint | undefined;
  const masse = data?.[2]?.result as bigint | undefined;

  return {
    enCours: isLoading,
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
  return useReadContract({
    ...payroll,
    functionName: "getAllEmployees",
    query: { enabled: actif, retry: false, refetchInterval: 12_000 },
  });
}

/** Fiche d'un salarié. Gardée : seuls le propriétaire et l'intéressé y accèdent. */
export function useSalarie(address: Address | undefined) {
  return useReadContract({
    ...payroll,
    functionName: "getEmployee",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });
}

/** Solde du jeton détenu par une adresse quelconque (l'employeur, par exemple). */
export function useSoldeJeton(address: Address | undefined) {
  return useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });
}

/** Autorisation accordée par l'employeur au contrat pour prélever le jeton. */
export function useAutorisation(proprietaire: Address | undefined) {
  return useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    functionName: "allowance",
    args: proprietaire ? [proprietaire, PAYROLL_ADDRESS] : undefined,
    query: { enabled: Boolean(proprietaire), refetchInterval: 12_000 },
  });
}
