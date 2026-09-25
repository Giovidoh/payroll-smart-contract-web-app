"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { CHAIN } from "@/lib/contracts/config";

/**
 * Session de la couche hors chaîne.
 *
 * La chaîne établit l'identité de l'appelant sans qu'on ait rien à faire :
 * `msg.sender` est posé par le protocole et ne se falsifie pas. Une base de
 * données n'a pas cet équivalent. Il faut donc que le portefeuille signe
 * explicitement un message (EIP-4361), que le serveur vérifie la signature,
 * puis qu'il scelle le résultat dans un cookie.
 *
 * C'est le prix de la couche hors chaîne, et il est payé en clair : une
 * demande de signature à l'entrée, là où la chaîne ne demandait rien.
 */
const CLEF = ["session"] as const;

async function json<T>(chemin: string, init?: RequestInit): Promise<T> {
  const r = await fetch(chemin, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const corps = (await r.json().catch(() => null)) as (T & { erreur?: string }) | null;
  if (!r.ok) throw new Error(corps?.erreur ?? `Le serveur a répondu ${r.status}.`);
  return corps as T;
}

export function useSession() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const qc = useQueryClient();

  const etat = useQuery({
    queryKey: CLEF,
    queryFn: () => json<{ adresse: string | null }>("/api/auth/session"),
    staleTime: 60_000,
    retry: false,
  });

  const ouvrir = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Aucun portefeuille connecté.");

      const { alea } = await json<{ alea: string }>("/api/auth/nonce", { method: "POST" });

      const message = createSiweMessage({
        address,
        chainId: CHAIN.id,
        domain: window.location.host,
        nonce: alea,
        uri: window.location.origin,
        version: "1",
        statement:
          "Prouvez que vous détenez cette adresse pour accéder aux informations " +
          "nominatives, que la chaîne ne conserve pas.",
      });

      const signature = await signMessageAsync({ message });
      return json<{ adresse: string }>("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ message, signature }),
      });
    },
    onSuccess: (r) => {
      qc.setQueryData(CLEF, { adresse: r.adresse });
      // Le répertoire dépend de la session : il redevient lisible.
      qc.invalidateQueries({ queryKey: ["repertoire"] });
    },
  });

  const fermer = useMutation({
    mutationFn: () => json<unknown>("/api/auth/session", { method: "DELETE" }),
    onSuccess: () => {
      qc.setQueryData(CLEF, { adresse: null });
      qc.invalidateQueries({ queryKey: ["repertoire"] });
    },
  });

  const adresseSession = etat.data?.adresse ?? null;

  /*
   * Une session ouverte pour une autre adresse que celle du portefeuille n'est
   * pas une session valide : c'est ce qui arrive quand on change de compte dans
   * MetaMask sans se déconnecter. Il faut resigner, faute de quoi l'employeur
   * verrait le répertoire avec les droits du compte précédent.
   */
  const concordante =
    Boolean(adresseSession) &&
    Boolean(address) &&
    adresseSession === address!.toLowerCase();

  return {
    /** Vraie quand la session correspond bien au compte connecté. */
    active: concordante,
    /** Session ouverte, mais pour un autre compte : il faut resigner. */
    desaccordee: Boolean(adresseSession) && Boolean(address) && !concordante,
    enCours: etat.isLoading,
    ouvrir: ouvrir.mutateAsync,
    ouvertureEnCours: ouvrir.isPending,
    erreur: ouvrir.error as Error | undefined,
    fermer: fermer.mutate,
    disponible: isConnected,
  };
}
