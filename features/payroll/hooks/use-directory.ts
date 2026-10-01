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
export type EmployeeRecord = {
  /** Adresse en chaîne, en minuscules, qui sert de clef. */
  address: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  /** Date d'embauche au format ISO (AAAA-MM-JJ), ou chaîne vide. */
  hireDate: string;
};

export type Directory = Record<string, EmployeeRecord>;

/** Ligne telle que la base la rend. */
type Row = {
  address: string;
  lastName: string;
  firstName: string;
  jobTitle: string;
  email: string;
  hireDate: string | null;
};

const normalize = (l: Row): EmployeeRecord => ({
  address: l.address.toLowerCase(),
  firstName: l.firstName,
  lastName: l.lastName,
  jobTitle: l.jobTitle,
  email: l.email,
  hireDate: l.hireDate ?? "",
});

const KEY = ["directory"] as const;

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!r.ok) throw new Error(body?.error ?? `Le serveur a répondu ${r.status}.`);
  return body as T;
}

const EMPTY: Directory = {};

function useDirectoryQuery() {
  const { active } = useSession();
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Directory> => {
      const { records } = await json<{ records: Row[] }>("/api/employees");
      const r: Directory = {};
      for (const l of records) r[l.address.toLowerCase()] = normalize(l);
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
export function useRecords(): Directory {
  return useDirectoryQuery().data ?? EMPTY;
}

/**
 * État de la lecture, pour les écrans qui doivent distinguer « pas de fiche »
 * de « je n'ai pas pu lire ». L'échec n'est jamais converti en répertoire vide :
 * afficher « identité non renseignée » alors que la lecture a été refusée
 * reviendrait à mentir sur l'état du système.
 */
export function useDirectoryState() {
  const r = useDirectoryQuery();
  return {
    busy: r.isLoading,
    failure: r.isError,
    error: r.error as Error | undefined,
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
export function useWriteRecord() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const save = useMutation({
    mutationFn: (record: EmployeeRecord) =>
      json<unknown>(`/api/employees/${record.address}`, {
        method: "PUT",
        body: JSON.stringify({
          lastName: record.lastName,
          firstName: record.firstName,
          jobTitle: record.jobTitle,
          email: record.email,
          hireDate: record.hireDate,
        }),
      }),
    onSuccess: refresh,
    onError: (e: Error) =>
      toast.error(`La fiche n'a pas été enregistrée : ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: (address: string) =>
      json<unknown>(`/api/employees/${address}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(`La fiche n'a pas été retirée : ${e.message}`),
  });

  /*
   * Les deux écritures rendent un booléen plutôt que rien : l'appelant qui
   * enchaîne dessus — annoncer l'effacement, par exemple — doit pouvoir
   * distinguer l'écriture faite de l'écriture manquée. Le motif de l'échec,
   * lui, est déjà signalé par `onError`, d'où le rejet absorbé ici.
   */
  return {
    save: (record: EmployeeRecord) =>
      save.mutateAsync(record).then(
        () => true,
        () => false
      ),
    remove: (address: string) =>
      remove.mutateAsync(address).then(
        () => true,
        () => false
      ),
    busy: save.isPending || remove.isPending,
  };
}

/** Nom affichable d'une adresse : la fiche si elle existe, sinon l'adresse abrégée. */
export function displayName(record: EmployeeRecord | undefined, address: string): string {
  if (record && (record.firstName || record.lastName)) {
    return `${record.firstName} ${record.lastName}`.trim();
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
