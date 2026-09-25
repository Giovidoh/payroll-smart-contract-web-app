"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "./use-session";

/**
 * Répertoire hors chaîne, servi par l'API.
 *
 * Il remplace le magasin de navigateur qui tenait ce rôle jusqu'ici. La
 * différence n'est pas seulement technique : les identités quittent le poste de
 * l'employeur pour une base MySQL, ce que les chapitres 3.3.4 et 4.2.2 du
 * mémoire décrivaient déjà comme l'architecture retenue.
 *
 * Le serveur ne sert à chacun que ce que le contrat lui reconnaît : le
 * personnel entier au propriétaire, sa seule fiche au salarié. C'est la garde
 * de `getEmployee` rejouée hors chaîne, faute de `msg.sender`.
 */
export type Fiche = {
  /** Adresse en chaîne, en minuscules, qui sert de clef. */
  address: string;
  prenom: string;
  nom: string;
  poste: string;
  email: string;
  /** Date d'embauche au format ISO (AAAA-MM-JJ), ou chaîne vide. */
  embauche: string;
};

export type Repertoire = Record<string, Fiche>;

/** Ligne telle que la base la rend. */
type Ligne = {
  adresse_ethereum: string;
  nom: string;
  prenom: string;
  poste: string;
  email: string;
  date_embauche: string | null;
};

const normaliser = (l: Ligne): Fiche => ({
  address: l.adresse_ethereum.toLowerCase(),
  prenom: l.prenom,
  nom: l.nom,
  poste: l.poste,
  email: l.email,
  embauche: l.date_embauche ?? "",
});

const CLEF = ["repertoire"] as const;

async function json<T>(chemin: string, init?: RequestInit): Promise<T> {
  const r = await fetch(chemin, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const corps = (await r.json().catch(() => null)) as (T & { erreur?: string }) | null;
  if (!r.ok) throw new Error(corps?.erreur ?? `Le serveur a répondu ${r.status}.`);
  return corps as T;
}

const VIDE: Repertoire = {};

function useRequete() {
  const { active } = useSession();
  return useQuery({
    queryKey: CLEF,
    queryFn: async (): Promise<Repertoire> => {
      const { fiches } = await json<{ fiches: Ligne[] }>("/api/employees");
      const r: Repertoire = {};
      for (const l of fiches) r[l.adresse_ethereum.toLowerCase()] = normaliser(l);
      return r;
    },
    // Sans session, le serveur refuse : inutile de l'interroger pour le savoir.
    enabled: active,
    retry: false,
  });
}

/**
 * Répertoire du contrat courant. Même forme que l'ancien magasin local, pour
 * que les écrans n'aient pas à connaître la provenance des fiches.
 */
export function useFiches(): Repertoire {
  return useRequete().data ?? VIDE;
}

/**
 * État de la lecture, pour les écrans qui doivent distinguer « pas de fiche »
 * de « je n'ai pas pu lire ». L'échec n'est jamais converti en répertoire vide :
 * afficher « identité non renseignée » alors que la lecture a été refusée
 * reviendrait à mentir sur l'état du système.
 */
export function useEtatRepertoire() {
  const r = useRequete();
  return {
    enCours: r.isLoading,
    echec: r.isError,
    erreur: r.error as Error | undefined,
  };
}

/**
 * Écritures du répertoire. Les deux fonctions gardent la signature de l'ancien
 * magasin local, de sorte que les écrans ignorent si la fiche part vers un
 * navigateur ou vers une base.
 *
 * L'échec est remonté par un `toast` plutôt qu'avalé : une fiche que l'employeur
 * croit enregistrée et qui ne l'est pas produirait un bulletin sans identité, le
 * jour de la paie.
 */
export function useEcrireFiche() {
  const qc = useQueryClient();
  const rafraichir = () => qc.invalidateQueries({ queryKey: CLEF });

  const enregistrer = useMutation({
    mutationFn: (fiche: Fiche) =>
      json<unknown>(`/api/employees/${fiche.address}`, {
        method: "PUT",
        body: JSON.stringify({
          nom: fiche.nom,
          prenom: fiche.prenom,
          poste: fiche.poste,
          email: fiche.email,
          embauche: fiche.embauche,
        }),
      }),
    onSuccess: rafraichir,
    onError: (e: Error) =>
      toast.error(`La fiche n'a pas été enregistrée : ${e.message}`),
  });

  const supprimer = useMutation({
    mutationFn: (address: string) =>
      json<unknown>(`/api/employees/${address}`, { method: "DELETE" }),
    onSuccess: rafraichir,
    onError: (e: Error) => toast.error(`La fiche n'a pas été retirée : ${e.message}`),
  });

  return {
    enregistrer: (fiche: Fiche) => enregistrer.mutate(fiche),
    supprimer: (address: string) => supprimer.mutate(address),
    enCours: enregistrer.isPending || supprimer.isPending,
  };
}

/** Nom affichable d'une adresse : la fiche si elle existe, sinon l'adresse abrégée. */
export function nomAffiche(fiche: Fiche | undefined, address: string): string {
  if (fiche && (fiche.prenom || fiche.nom)) {
    return `${fiche.prenom} ${fiche.nom}`.trim();
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
