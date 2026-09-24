"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { CHAIN, PAYROLL_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts/config";
import { useSalarie, useParametres } from "./use-payroll";
import { useEvenements } from "./use-events";

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
export function useMonEspace() {
  const { address } = useAccount();
  const { data: fiche } = useSalarie(address);
  const { data: evenements, isLoading } = useEvenements();
  const { cyclesReserves } = useParametres();

  const { data: soldeContrat } = useReadContract({
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
  const { data: surplus, isError: reserveEntamee } = useReadContract({
    abi: payrollAbi,
    address: PAYROLL_ADDRESS,
    chainId: CHAIN.id,
    functionName: "getAvailableAmountForWithdrawal",
    query: { retry: false, refetchInterval: 12_000 },
  });

  /** masse = (solde − surplus) / cycles */
  const masse = useMemo(() => {
    if (
      soldeContrat === undefined ||
      surplus === undefined ||
      cyclesReserves === undefined ||
      cyclesReserves === 0n
    ) {
      return undefined;
    }
    return (soldeContrat - surplus) / cyclesReserves;
  }, [soldeContrat, surplus, cyclesReserves]);

  const versements = useMemo(() => {
    if (!address || !evenements) return [];
    const moi = address.toLowerCase();
    return evenements.filter(
      (e) => e.type === "SalaryPaid" && e.sujet?.toLowerCase() === moi
    );
  }, [evenements, address]);

  const totalPercu = versements.reduce((s, v) => s + (v.montant ?? 0n), 0n);

  return {
    enCours: isLoading,
    adresse: address,
    salaire: fiche?.salary,
    masse,
    soldeContrat,
    cyclesReserves,
    /** Vrai si le solde ne couvre même pas la réserve : la paie échouerait. */
    reserveEntamee,
    provisionSuffisante:
      soldeContrat !== undefined && masse !== undefined
        ? soldeContrat >= masse
        : reserveEntamee
          ? false
          : undefined,
    versements,
    totalPercu,
  };
}
