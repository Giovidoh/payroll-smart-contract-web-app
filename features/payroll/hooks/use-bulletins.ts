"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFiches, type Fiche } from "./use-directory";
import { useSession } from "./use-session";
import { engendrerBulletin, nomFichierBulletin } from "../lib/bulletin";

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
export type Versement = {
  adresse: string;
  montant: bigint;
  date: bigint;
  hash: string;
  logIndex: number;
};

const CLEF = ["registre"] as const;

type LigneRegistre = {
  adresse_ethereum: string;
  hash_transaction: string;
  numero_log: number;
  date_emission: string;
};

async function json<T>(chemin: string, init?: RequestInit): Promise<T> {
  const r = await fetch(chemin, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const corps = (await r.json().catch(() => null)) as (T & { erreur?: string }) | null;
  if (!r.ok) throw new Error(corps?.erreur ?? `Le serveur a répondu ${r.status}.`);
  return corps as T;
}

/** Repère d'une ligne du registre, stable entre les deux sources. */
const repere = (hash: string, logIndex: number) => `${hash.toLowerCase()}-${logIndex}`;

/** Registre des bulletins déjà émis, pour l'appelant et selon ses droits. */
export function useRegistre() {
  const { active } = useSession();

  const requete = useQuery({
    queryKey: CLEF,
    queryFn: async (): Promise<Set<string>> => {
      const { bulletins } = await json<{ bulletins: LigneRegistre[] }>("/api/payslips");
      return new Set(bulletins.map((b) => repere(b.hash_transaction, b.numero_log)));
    },
    enabled: active,
    retry: false,
  });

  return {
    emis: requete.data ?? new Set<string>(),
    enCours: requete.isLoading,
    echec: requete.isError,
  };
}

export function useEmettreBulletin() {
  const fiches = useFiches();
  const qc = useQueryClient();

  /**
   * Produit le document, puis consigne l'émission. L'ordre compte : le document
   * est remis même si l'inscription au registre échoue, car c'est lui que la loi
   * impose de délivrer au salarié. L'échec de l'inscription est signalé, jamais
   * tu — un registre incomplet est un manquement distinct, et le masquer
   * reviendrait à croire tenu ce qui ne l'est pas.
   */
  return async (v: Versement): Promise<void> => {
    const fiche: Fiche | undefined = fiches[v.adresse.toLowerCase()];

    try {
      const donnees = {
        salarie: fiche,
        adresse: v.adresse,
        montant: v.montant,
        date: v.date,
        hash: v.hash,
      };
      engendrerBulletin(donnees).save(nomFichierBulletin(donnees));
    } catch {
      toast.error("La génération du bulletin a échoué.");
      return;
    }

    if (!fiche) {
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
          adresse: v.adresse,
          hash: v.hash,
          numeroLog: v.logIndex,
        }),
      });
      qc.invalidateQueries({ queryKey: CLEF });
    } catch (e) {
      toast.error(
        `Bulletin remis, mais non inscrit au registre : ${(e as Error).message}`
      );
    }
  };
}

export { repere };
