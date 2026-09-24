import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * Un seul réseau : Sepolia. Le contrat n'existe nulle part ailleurs, et proposer
 * d'autres chaînes donnerait à croire le contraire.
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  /*
   * Les écrans montent une dizaine de lectures indépendantes, chacune
   * rafraîchie toutes les douze secondes. Sans regroupement, cela fait autant
   * de requêtes HTTP ; le point d'accès public les refuserait. `multicall`
   * les réunit en un seul appel, et `batch` regroupe ce qui reste.
   */
  batch: { multicall: { wait: 32 } },
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL, { batch: true }),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
