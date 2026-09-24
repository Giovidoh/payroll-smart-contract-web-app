"use client";

import { useCallback, useState } from "react";
import { useAccount, useConfig, usePublicClient } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi, type Abi, type Address, type Hash } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { CHAIN, PAYROLL_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts/config";
import { decodeContractError } from "@/lib/contracts/errors";

/**
 * Cycle de vie d'une transaction, tel que la maquette le décrit (D1 à D4) :
 * on annonce ce qui va être signé, on attend la signature, on attend le bloc,
 * puis on rend compte. Une transaction qui échoue doit dire *pourquoi*, en
 * français, d'où le passage systématique par `decodeContractError`.
 */
export type EtatTx =
  | { phase: "repos" }
  | { phase: "confirmation" }
  | { phase: "signature" }
  | { phase: "attente"; hash: Hash }
  | { phase: "succes"; hash: Hash }
  | { phase: "echec"; message: string; hash?: Hash };

export type EtapeTx = { libelle: string; etat: "attente" | "encours" | "faite" };

export type Operation = {
  /** Intitulé affiché en tête de la boîte de dialogue. */
  titre: string;
  /** Code d'écran de la maquette, affiché en petit à droite du titre. */
  code: string;
  /** Phrase qui explique ce que l'utilisateur s'apprête à signer. */
  message: string;
  /** Récapitulatif chiffré, affiché avant signature. */
  lignes?: { label: string; valeur: string }[];
  /** Étapes, quand l'opération en demande plusieurs (autorisation puis dépôt). */
  etapes?: string[];
  /** Les appels à enchaîner, dans l'ordre. */
  appels: AppelContrat[];
};

export type AppelContrat = {
  cible: "payroll" | "token";
  fonction: string;
  args: readonly unknown[];
};

function resoudre(appel: AppelContrat): {
  abi: Abi;
  address: Address;
  functionName: string;
  args: readonly unknown[];
} {
  return appel.cible === "payroll"
    ? {
        abi: payrollAbi as unknown as Abi,
        address: PAYROLL_ADDRESS,
        functionName: appel.fonction,
        args: appel.args,
      }
    : {
        abi: erc20Abi as unknown as Abi,
        address: TOKEN_ADDRESS,
        functionName: appel.fonction,
        args: appel.args,
      };
}

export function useTransaction() {
  const config = useConfig();
  const client = usePublicClient({ chainId: CHAIN.id });
  const { address } = useAccount();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [etat, setEtat] = useState<EtatTx>({ phase: "repos" });
  const [etapeCourante, setEtapeCourante] = useState(0);

  /** Ouvre la boîte de dialogue sur l'écran de confirmation (D1). */
  const demander = useCallback((op: Operation) => {
    setOperation(op);
    setEtapeCourante(0);
    setEtat({ phase: "confirmation" });
  }, []);

  const fermer = useCallback(() => {
    setOperation(null);
    setEtat({ phase: "repos" });
    setEtapeCourante(0);
  }, []);

  /**
   * Simule chaque appel avant de le soumettre. C'est ce qui permet d'afficher
   * « la réserve immobilisée protège les salaires à venir » plutôt que de laisser
   * l'utilisateur dépenser du gas pour découvrir le refus.
   */
  const executer = useCallback(async (): Promise<boolean> => {
    if (!operation || !client || !address) return false;

    let dernierHash: Hash | undefined;

    for (let i = 0; i < operation.appels.length; i++) {
      setEtapeCourante(i);
      const params = resoudre(operation.appels[i]);

      try {
        setEtat({ phase: "signature" });
        await client.simulateContract({ ...params, account: address });

        const hash = await writeContract(config, params as never);
        dernierHash = hash;
        setEtat({ phase: "attente", hash });

        const recu = await waitForTransactionReceipt(config, { hash });
        if (recu.status === "reverted") {
          setEtat({
            phase: "echec",
            hash,
            message:
              "La transaction a été incluse dans un bloc mais le contrat l'a rejetée.",
          });
          return false;
        }
      } catch (e) {
        setEtat({
          phase: "echec",
          hash: dernierHash,
          message: decodeContractError(e),
        });
        return false;
      }
    }

    setEtat({ phase: "succes", hash: dernierHash! });
    return true;
  }, [operation, client, address, config]);

  const etapes: EtapeTx[] | undefined = operation?.etapes?.map((libelle, i) => ({
    libelle,
    etat:
      etat.phase === "succes" || i < etapeCourante
        ? "faite"
        : i === etapeCourante && etat.phase !== "confirmation"
          ? "encours"
          : "attente",
  }));

  return { operation, etat, etapes, demander, executer, fermer };
}
