import { z } from "zod";
import { createPublicClient, http } from "viem";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { CHAIN } from "@/lib/contracts/config";
import { AUTH_DOMAIN } from "@/lib/server/env";
import {
  consommerAlea,
  ouvrirSession,
  fermerSession,
  adresseAppelante,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * `verifySiweMessage` a besoin d'un client : une signature peut émaner d'un
 * compte intelligent, auquel cas elle se vérifie par un appel `isValidSignature`
 * sur la chaîne (ERC-1271) et non par récupération de clef. Le portefeuille de
 * démonstration en est un, cette branche n'est donc pas théorique.
 */
const client = createPublicClient({
  chain: CHAIN,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
});

const Corps = z.object({
  message: z.string().min(1).max(4000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export async function POST(requete: Request): Promise<Response> {
  const analyse = Corps.safeParse(await requete.json().catch(() => null));
  if (!analyse.success) {
    return Response.json({ erreur: "Requête mal formée." }, { status: 400 });
  }

  const { message, signature } = analyse.data;

  const champs = parseSiweMessage(message);
  if (!champs.nonce || !champs.address) {
    return Response.json({ erreur: "Message d'authentification incomplet." }, { status: 400 });
  }

  /*
   * L'aléa est consommé avant la vérification de la signature, et non après :
   * autrement, un même aléa pourrait alimenter autant de tentatives que
   * souhaité. Une signature invalide coûte donc un aléa, ce qui est voulu.
   */
  if (!consommerAlea(champs.nonce)) {
    return Response.json(
      { erreur: "Aléa inconnu ou expiré. Recommencez l'authentification." },
      { status: 401 }
    );
  }

  /*
   * Le domaine attendu vient de la configuration du serveur, jamais de la
   * requête : `new URL(requete.url).host` refléterait l'en-tête `Host`, que
   * l'appelant fixe à sa guise. Une signature obtenue sur un site
   * d'hameçonnage, donc portant son domaine, serait alors acceptée ici.
   *
   * L'aléa est passé explicitement pour que la vérification porte sur celui
   * qui vient d'être consommé, et non sur un autre que le message porterait.
   */
  const valide = await verifySiweMessage(client, {
    message,
    signature: signature as `0x${string}`,
    domain: AUTH_DOMAIN,
    nonce: champs.nonce,
  }).catch(() => false);

  if (!valide) {
    return Response.json({ erreur: "Signature invalide." }, { status: 401 });
  }

  if (champs.chainId !== undefined && champs.chainId !== CHAIN.id) {
    return Response.json(
      { erreur: `Message signé pour un autre réseau que ${CHAIN.name}.` },
      { status: 401 }
    );
  }

  await ouvrirSession(champs.address);
  return Response.json({ adresse: champs.address.toLowerCase() });
}

/** État de la session courante, pour que le client sache s'il doit faire signer. */
export async function GET(): Promise<Response> {
  return Response.json({ adresse: await adresseAppelante() });
}

export async function DELETE(): Promise<Response> {
  await fermerSession();
  return Response.json({ adresse: null });
}
