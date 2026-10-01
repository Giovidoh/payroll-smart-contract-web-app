import "server-only";

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Address } from "viem";
import { SESSION_SECRET, SESSION_TTL, NONCE_TTL } from "./env";

export const COOKIE_SESSION = "paie-session";

/**
 * Session sans état : le cookie porte lui-même l'adresse et l'échéance, scellées
 * par un HMAC. Rien n'est conservé en base, ce qui évite d'ajouter au modèle de
 * données une troisième table étrangère au sujet du mémoire.
 *
 * Le sceau interdit la falsification ; il n'interdit pas la lecture. Le cookie
 * ne contient donc qu'une adresse publique, jamais de donnée nominative.
 */
type Loaded = { address: string; dueDate: number };

function seal(loaded: Loaded): string {
  const body = Buffer.from(JSON.stringify(loaded)).toString("base64url");
  const sealValue = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sealValue}`;
}

function unseal(token: string): Loaded | null {
  const [body, sealValue] = token.split(".");
  if (!body || !sealValue) return null;

  const expected = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");

  /*
   * Comparaison à durée constante. Une comparaison ordinaire s'arrête au
   * premier octet qui diffère : le temps de réponse renseignerait alors sur le
   * nombre d'octets corrects, et permettrait de reconstituer le sceau octet
   * par octet.
   */
  const a = Buffer.from(sealValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const loaded = JSON.parse(Buffer.from(body, "base64url").toString()) as Loaded;
    if (typeof loaded.address !== "string" || typeof loaded.dueDate !== "number") {
      return null;
    }
    if (loaded.dueDate < Math.floor(Date.now() / 1000)) return null;
    return loaded;
  } catch {
    return null;
  }
}

export async function openSession(address: Address): Promise<void> {
  const token = seal({
    address: address.toLowerCase(),
    dueDate: Math.floor(Date.now() / 1000) + SESSION_TTL,
  });

  (await cookies()).set(COOKIE_SESSION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function closeSession(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSION);
}

/** Adresse de l'appelant, ou `null` si la session est absente, expirée ou falsifiée. */
export async function callerAddress(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!token) return null;
  return unseal(token)?.address ?? null;
}

/* -------------------------------------------------------------------------- */
/* Aléas d'authentification                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Les aléas vivent en mémoire du processus.
 *
 * Limite assumée et consignée : un redémarrage les perd, et l'approche ne
 * survivrait pas à plusieurs instances derrière un répartiteur. La parade
 * usuelle est une table ou un cache partagé ; elle sort du périmètre de ce
 * travail, dont la couche hors chaîne sert une démonstration mono-instance.
 */
const NONCES = new Map<string, number>();

export function generateNonce(): string {
  purge();
  const nonce = randomBytes(16).toString("hex");
  NONCES.set(nonce, Math.floor(Date.now() / 1000) + NONCE_TTL);
  return nonce;
}

/** Consomme l'aléa : un même aléa ne peut servir qu'une fois, ce qui ferme le rejeu. */
export function consumeNonce(nonce: string): boolean {
  purge();
  if (!NONCES.has(nonce)) return false;
  NONCES.delete(nonce);
  return true;
}

function purge(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [nonce, dueDate] of NONCES) {
    if (dueDate < now) NONCES.delete(nonce);
  }
}
