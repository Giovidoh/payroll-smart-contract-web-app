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
export type TxState =
  | { phase: "idle" }
  | { phase: "confirmation" }
  | { phase: "signature" }
  | { phase: "waiting"; hash: Hash }
  | { phase: "success"; hash: Hash }
  | { phase: "failure"; message: string; hash?: Hash };

export type TxStep = { label: string; state: "waiting" | "active" | "done" };

export type Operation = {
  /** Intitulé affiché en tête de la boîte de dialogue. */
  title: string;
  /** Code d'écran de la maquette, affiché en petit à droite du titre. */
  code: string;
  /** Phrase qui explique ce que l'utilisateur s'apprête à signer. */
  message: string;
  /** Récapitulatif chiffré, affiché avant signature. */
  rows?: { label: string; value: string }[];
  /** Étapes, quand l'opération en demande plusieurs (autorisation puis dépôt). */
  steps?: string[];
  /** Les appels à enchaîner, dans l'ordre. */
  calls: ContractCall[];
  /**
   * Effet hors chaîne à n'exécuter qu'une fois la chaîne acquise.
   *
   * Les deux couches n'ont pas les mêmes garanties : la chaîne refuse, revient
   * en arrière, ou n'est jamais signée, tandis qu'une écriture en base est
   * acquise dès qu'elle est faite. Écrire ou effacer hors chaîne avant la
   * signature, c'est donc engager la couche qui ne sait pas revenir sur la foi
   * de celle qui peut encore refuser — et, pour un retrait, perdre l'identité
   * d'un salarié qui figure toujours dans le contrat.
   *
   * L'inverse — la chaîne acquise, l'effet hors chaîne manqué — reste possible
   * et n'est pas réparé ici : il laisse une fiche orpheline, visible et
   * corrigeable à la main. C'est l'asymétrie acceptable des deux.
   */
  after?: () => void | Promise<void>;
};

export type ContractCall = {
  target: "payroll" | "token";
  functionName: string;
  args: readonly unknown[];
};

function resolve(call: ContractCall): {
  abi: Abi;
  address: Address;
  functionName: string;
  args: readonly unknown[];
} {
  return call.target === "payroll"
    ? {
        abi: payrollAbi as unknown as Abi,
        address: PAYROLL_ADDRESS,
        functionName: call.functionName,
        args: call.args,
      }
    : {
        abi: erc20Abi as unknown as Abi,
        address: TOKEN_ADDRESS,
        functionName: call.functionName,
        args: call.args,
      };
}

export function useTransaction() {
  const config = useConfig();
  const client = usePublicClient({ chainId: CHAIN.id });
  const { address } = useAccount();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const [currentStep, setCurrentStep] = useState(0);

  /** Ouvre la boîte de dialogue sur l'écran de confirmation (D1). */
  const requestOperation = useCallback((op: Operation) => {
    setOperation(op);
    setCurrentStep(0);
    setState({ phase: "confirmation" });
  }, []);

  const close = useCallback(() => {
    setOperation(null);
    setState({ phase: "idle" });
    setCurrentStep(0);
  }, []);

  /**
   * Simule chaque appel avant de le soumettre. C'est ce qui permet d'afficher
   * « la réserve immobilisée protège les salaires à venir » plutôt que de laisser
   * l'utilisateur dépenser du gas pour découvrir le refus.
   */
  const run = useCallback(async (): Promise<boolean> => {
    if (!operation || !client || !address) return false;

    let lastHash: Hash | undefined;

    for (let i = 0; i < operation.calls.length; i++) {
      setCurrentStep(i);
      const params = resolve(operation.calls[i]);

      try {
        setState({ phase: "signature" });
        await client.simulateContract({ ...params, account: address });

        const hash = await writeContract(config, params as never);
        lastHash = hash;
        setState({ phase: "waiting", hash });

        const received = await waitForTransactionReceipt(config, { hash });
        if (received.status === "reverted") {
          setState({
            phase: "failure",
            hash,
            message:
              "La transaction a été incluse dans un bloc mais le contrat l'a rejetée.",
          });
          return false;
        }
      } catch (e) {
        setState({
          phase: "failure",
          hash: lastHash,
          message: decodeContractError(e),
        });
        return false;
      }
    }

    setState({ phase: "success", hash: lastHash! });

    /*
     * L'effet hors chaîne suit le succès, il ne le conditionne pas : la
     * transaction est dans un bloc, la dire échouée parce qu'une écriture en
     * base a manqué serait faux. Les appelants signalent eux-mêmes leur échec.
     */
    if (operation.after) {
      try {
        await operation.after();
      } catch {
        /* Déjà signalé par l'appelant. */
      }
    }

    return true;
  }, [operation, client, address, config]);

  const steps: TxStep[] | undefined = operation?.steps?.map((label, i) => ({
    label,
    state:
      state.phase === "success" || i < currentStep
        ? "done"
        : i === currentStep && state.phase !== "confirmation"
          ? "active"
          : "waiting",
  }));

  return { operation, state, steps, requestOperation, run, close };
}
