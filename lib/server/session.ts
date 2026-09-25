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
type Charge = { adresse: string; echeance: number };

function sceller(charge: Charge): string {
  const corps = Buffer.from(JSON.stringify(charge)).toString("base64url");
  const sceau = createHmac("sha256", SESSION_SECRET).update(corps).digest("base64url");
  return `${corps}.${sceau}`;
}

function desceller(jeton: string): Charge | null {
  const [corps, sceau] = jeton.split(".");
  if (!corps || !sceau) return null;

  const attendu = createHmac("sha256", SESSION_SECRET).update(corps).digest("base64url");

  /*
   * Comparaison à durée constante. Une comparaison ordinaire s'arrête au
   * premier octet qui diffère : le temps de réponse renseignerait alors sur le
   * nombre d'octets corrects, et permettrait de reconstituer le sceau octet
   * par octet.
   */
  const a = Buffer.from(sceau);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const charge = JSON.parse(Buffer.from(corps, "base64url").toString()) as Charge;
    if (typeof charge.adresse !== "string" || typeof charge.echeance !== "number") {
      return null;
    }
    if (charge.echeance < Math.floor(Date.now() / 1000)) return null;
    return charge;
  } catch {
    return null;
  }
}

export async function ouvrirSession(adresse: Address): Promise<void> {
  const jeton = sceller({
    adresse: adresse.toLowerCase(),
    echeance: Math.floor(Date.now() / 1000) + SESSION_TTL,
  });

  (await cookies()).set(COOKIE_SESSION, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSION);
}

/** Adresse de l'appelant, ou `null` si la session est absente, expirée ou falsifiée. */
export async function adresseAppelante(): Promise<string | null> {
  const jeton = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!jeton) return null;
  return desceller(jeton)?.adresse ?? null;
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
const ALEAS = new Map<string, number>();

export function engendrerAlea(): string {
  purger();
  const alea = randomBytes(16).toString("hex");
  ALEAS.set(alea, Math.floor(Date.now() / 1000) + NONCE_TTL);
  return alea;
}

/** Consomme l'aléa : un même aléa ne peut servir qu'une fois, ce qui ferme le rejeu. */
export function consommerAlea(alea: string): boolean {
  purger();
  if (!ALEAS.has(alea)) return false;
  ALEAS.delete(alea);
  return true;
}

function purger(): void {
  const maintenant = Math.floor(Date.now() / 1000);
  for (const [alea, echeance] of ALEAS) {
    if (echeance < maintenant) ALEAS.delete(alea);
  }
}
