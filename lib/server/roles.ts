import "server-only";

import { createPublicClient, http } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { CHAIN, PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { adresseAppelante } from "./session";

/**
 * Une base de données n'a pas de `msg.sender`.
 *
 * Le contrat garde ses lectures par une règle simple — « le propriétaire ou
 * l'intéressé » — que le moteur d'exécution applique sans qu'on ait à y penser.
 * Hors chaîne, cette garde doit être réimplémentée, et surtout : le rôle doit
 * être établi *depuis la chaîne*. Le déduire d'une colonne ferait de la base sa
 * propre autorité, et un accès en écriture à la base suffirait alors à se
 * déclarer employeur.
 */
const client = createPublicClient({
  chain: CHAIN,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
});

/** Le propriétaire change rarement ; l'interroger à chaque requête serait inutile. */
const DUREE_CACHE = 30_000;
let cache: { adresse: string; releveA: number } | null = null;

async function proprietaire(): Promise<string> {
  if (cache && Date.now() - cache.releveA < DUREE_CACHE) return cache.adresse;

  const adresse = (await client.readContract({
    abi: payrollAbi,
    address: PAYROLL_ADDRESS,
    functionName: "owner",
  })) as string;

  cache = { adresse: adresse.toLowerCase(), releveA: Date.now() };
  return cache.adresse;
}

export type Appelant = {
  adresse: string;
  estProprietaire: boolean;
  /** Déploiement auquel la requête se rapporte, pris de la configuration serveur. */
  contrat: string;
};

/**
 * Identifie l'appelant, ou renvoie `null` s'il n'a pas de session valide.
 *
 * Le contrat n'est jamais pris de la requête : un appelant qui choisirait son
 * cloisonnement lirait le personnel d'un autre déploiement.
 */
export async function identifier(): Promise<Appelant | null> {
  const adresse = await adresseAppelante();
  if (!adresse) return null;

  return {
    adresse,
    estProprietaire: adresse === (await proprietaire()),
    contrat: PAYROLL_ADDRESS.toLowerCase(),
  };
}

/* -------------------------------------------------------------------------- */
/* Réponses normalisées                                                       */
/* -------------------------------------------------------------------------- */

export function refus(message: string, code = 403): Response {
  return Response.json({ erreur: message }, { status: code });
}

export const NON_AUTHENTIFIE = () =>
  refus("Session absente ou expirée. Signez pour vous authentifier.", 401);

export const RESERVE_EMPLOYEUR = () =>
  refus("Opération réservée au propriétaire du contrat.", 403);
