import { z } from "zod";
import { createPublicClient, http } from "viem";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { CHAIN } from "@/lib/contracts/config";
import { AUTH_DOMAIN } from "@/lib/server/env";
import {
  consumeNonce,
  openSession,
  closeSession,
  callerAddress,
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

const SessionBody = z.object({
  message: z.string().min(1).max(4000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = SessionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Requête mal formée." }, { status: 400 });
  }

  const { message, signature } = parsed.data;

  const fields = parseSiweMessage(message);
  if (!fields.nonce || !fields.address) {
    return Response.json({ error: "Message d'authentification incomplet." }, { status: 400 });
  }

  /*
   * L'aléa est consommé avant la vérification de la signature, et non après :
   * autrement, un même aléa pourrait alimenter autant de tentatives que
   * souhaité. Une signature invalide coûte donc un aléa, ce qui est voulu.
   */
  if (!consumeNonce(fields.nonce)) {
    return Response.json(
      { error: "Aléa inconnu ou expiré. Recommencez l'authentification." },
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
  const valid = await verifySiweMessage(client, {
    message,
    signature: signature as `0x${string}`,
    domain: AUTH_DOMAIN,
    nonce: fields.nonce,
  }).catch(() => false);

  if (!valid) {
    return Response.json({ error: "Signature invalide." }, { status: 401 });
  }

  if (fields.chainId !== undefined && fields.chainId !== CHAIN.id) {
    return Response.json(
      { error: `Message signé pour un autre réseau que ${CHAIN.name}.` },
      { status: 401 }
    );
  }

  await openSession(fields.address);
  return Response.json({ address: fields.address.toLowerCase() });
}

/** État de la session courante, pour que le client sache s'il doit faire signer. */
export async function GET(): Promise<Response> {
  return Response.json({ address: await callerAddress() });
}

export async function DELETE(): Promise<Response> {
  await closeSession();
  return Response.json({ address: null });
}
