import "server-only";

import { createPublicClient, http } from "viem";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import { CHAIN, PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { callerAddress } from "./session";

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
const CACHE_TTL = 30_000;
let cache: { address: string; fetchedAt: number } | null = null;

async function readOwner(): Promise<string> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.address;

  const address = (await client.readContract({
    abi: payrollAbi,
    address: PAYROLL_ADDRESS,
    functionName: "owner",
  })) as string;

  cache = { address: address.toLowerCase(), fetchedAt: Date.now() };
  return cache.address;
}

export type Caller = {
  address: string;
  isOwner: boolean;
  /** Déploiement auquel la requête se rapporte, pris de la configuration serveur. */
  contract: string;
};

/**
 * Identifie l'appelant, ou renvoie `null` s'il n'a pas de session valide.
 *
 * Le contrat n'est jamais pris de la requête : un appelant qui choisirait son
 * cloisonnement lirait le personnel d'un autre déploiement.
 */
export async function identifier(): Promise<Caller | null> {
  const address = await callerAddress();
  if (!address) return null;

  return {
    address,
    isOwner: address === (await readOwner()),
    contract: PAYROLL_ADDRESS.toLowerCase(),
  };
}

/* -------------------------------------------------------------------------- */
/* Réponses normalisées                                                       */
/* -------------------------------------------------------------------------- */

export function reject(message: string, code = 403): Response {
  return Response.json({ error: message }, { status: code });
}

export const UNAUTHENTICATED = () =>
  reject("Session absente ou expirée. Signez pour vous authentifier.", 401);

export const OWNER_ONLY = () =>
  reject("Opération réservée au propriétaire du contrat.", 403);
