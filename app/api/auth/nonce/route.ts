import { engendrerAlea } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Premier temps de l'authentification EIP-4361. Le serveur engendre un aléa que
 * le client fera figurer dans le message signé : sans lui, une signature
 * interceptée serait rejouable indéfiniment.
 */
export async function POST(): Promise<Response> {
  return Response.json({ alea: engendrerAlea() });
}
