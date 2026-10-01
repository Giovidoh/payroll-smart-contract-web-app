"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { CHAIN, PAYROLL_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts/config";
import { useEmployee, useSettings } from "./use-payroll";
import { useEvents } from "./use-events";

/**
 * Données de l'espace salarié.
 *
 * Trois des quatre accesseurs utiles à l'employeur sont fermés au salarié :
 * `getAllEmployees()`, `getEmployeeExistence()` et `getTotalSalaries()` portent
 * toutes le modificateur `onlyOwner`. Un salarié ne peut donc connaître ni
 * l'effectif, ni la liste des bénéficiaires.
 *
 * La masse salariale, elle, reste déductible — et c'est une limite du
 * cloisonnement. `getAvailableAmountForWithdrawal()` n'est gardée par rien et
 * renvoie `solde − masse × cycles`. Connaissant le solde du jeton, qui est
 * public par nature, et le nombre de cycles, qui l'est aussi, toute adresse
 * retrouve la masse salariale par une soustraction et une division. La garde
 * posée sur `getTotalSalaries()` ne protège donc pas la valeur qu'elle
 * dissimule, seulement le chemin le plus court pour y accéder.
 */
export function useMyAccount() {
  const { address } = useAccount();
  const { data: record } = useEmployee(address);
  const { data: events, isLoading, isError: logsFailure } = useEvents();
  const { reservedCycles } = useSettings();

  const { data: contractBalance } = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    chainId: CHAIN.id,
    functionName: "balanceOf",
    args: [PAYROLL_ADDRESS],
    query: { refetchInterval: 12_000 },
  });

  /**
   * Cette fonction *revert* lorsque le solde ne couvre même pas la réserve.
   * Ce refus est lui-même une information : il dit que le contrat est
   * sous-provisionné au regard des cycles réservés.
   */
  const { data: surplus, isError: reserveBreached } = useReadContract({
    abi: payrollAbi,
    address: PAYROLL_ADDRESS,
    chainId: CHAIN.id,
    functionName: "getAvailableAmountForWithdrawal",
    query: { retry: false, refetchInterval: 12_000 },
  });

  /** masse = (solde − surplus) / cycles */
  const payrollTotal = useMemo(() => {
    if (
      contractBalance === undefined ||
      surplus === undefined ||
      reservedCycles === undefined ||
      reservedCycles === 0n
    ) {
      return undefined;
    }
    return (contractBalance - surplus) / reservedCycles;
  }, [contractBalance, surplus, reservedCycles]);

  const payments = useMemo(() => {
    if (!address || !events) return [];
    const ownRecord = address.toLowerCase();
    return events.filter(
      (e) => e.type === "SalaryPaid" && e.subject?.toLowerCase() === ownRecord
    );
  }, [events, address]);

  const totalReceived = payments.reduce((s, v) => s + (v.amount ?? 0n), 0n);

  return {
    busy: isLoading,
    address: address,
    salary: record?.salary,
    payrollTotal,
    contractBalance,
    reservedCycles,
    /** Vrai si le solde ne couvre même pas la réserve : la paie échouerait. */
    reserveBreached,
    sufficientlyFunded:
      contractBalance !== undefined && payrollTotal !== undefined
        ? contractBalance >= payrollTotal
        : reserveBreached
          ? false
          : undefined,
    payments,
    totalReceived,
    /** Vrai si les journaux n'ont pas pu être lus : la liste vide ne vaut rien. */
    logsFailure,
  };
}
