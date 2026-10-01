"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRecords, type EmployeeRecord } from "./use-directory";
import { useSession } from "./use-session";
import { generatePayslip, payslipFileName } from "../lib/payslip";

/**
 * Production des bulletins et tenue du registre.
 *
 * L'article 166 du Code du travail togolais impose deux choses distinctes :
 * délivrer un bulletin individuel au moment du paiement, et tenir un registre
 * des paiements. La première est remplie par le document PDF ; la seconde par
 * la table `BulletinPaie`, que l'émission alimente ici.
 *
 * Le registre ne conserve ni montant ni date : ces données ne viennent que des
 * événements de la chaîne. Il atteste qu'un bulletin a été établi, pour qui, et
 * contre quelle inscription — le couple (hachage, index de journal), puisqu'une
 * exécution de la paie verse à tous les salariés dans une transaction unique.
 */
export type Payment = {
  address: string;
  amount: bigint;
  date: bigint;
  hash: string;
  logIndex: number;
};

const KEY = ["payslipRegistry"] as const;

type RegistryRow = {
  address: string;
  txHash: string;
  logIndex: number;
  issuedAt: string;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!r.ok) throw new Error(body?.error ?? `Le serveur a répondu ${r.status}.`);
  return body as T;
}

/** Repère d'une ligne du registre, stable entre les deux sources. */
const logKey = (hash: string, logIndex: number) => `${hash.toLowerCase()}-${logIndex}`;

/** Registre des bulletins déjà émis, pour l'appelant et selon ses droits. */
export function usePayslipRegistry() {
  const { active } = useSession();

  const request = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Set<string>> => {
      const { payslips } = await json<{ payslips: RegistryRow[] }>("/api/payslips");
      return new Set(payslips.map((b) => logKey(b.txHash, b.logIndex)));
    },
    enabled: active,
    retry: false,
  });

  return {
    issued: request.data ?? new Set<string>(),
    busy: request.isLoading,
    failure: request.isError,
  };
}

export function useIssuePayslip() {
  const records = useRecords();
  const qc = useQueryClient();

  /**
   * Produit le document, puis consigne l'émission. L'ordre compte : le document
   * est remis même si l'inscription au registre échoue, car c'est lui que la loi
   * impose de délivrer au salarié. L'échec de l'inscription est signalé, jamais
   * tu — un registre incomplet est un manquement distinct, et le masquer
   * reviendrait à croire tenu ce qui ne l'est pas.
   */
  return async (v: Payment): Promise<void> => {
    const record: EmployeeRecord | undefined = records[v.address.toLowerCase()];

    try {
      const payslipData = {
        employee: record,
        address: v.address,
        amount: v.amount,
        date: v.date,
        hash: v.hash,
      };
      generatePayslip(payslipData).save(payslipFileName(payslipData));
    } catch {
      toast.error("La génération du bulletin a échoué.");
      return;
    }

    if (!record) {
      /*
       * La chaîne paie des adresses, pas des personnes. Un versement vers une
       * adresse dont l'identité n'est pas renseignée produit un bulletin sans
       * nom, que le registre refuse : il n'a rien à quoi le rattacher.
       */
      toast.warning(
        "Bulletin produit sans identité : renseignez la fiche du salarié pour qu'il soit inscrit au registre."
      );
      return;
    }

    try {
      await json("/api/payslips", {
        method: "POST",
        body: JSON.stringify({
          address: v.address,
          hash: v.hash,
          logIndex: v.logIndex,
        }),
      });
      qc.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error(
        `Bulletin remis, mais non inscrit au registre : ${(e as Error).message}`
      );
    }
  };
}

export { logKey };
