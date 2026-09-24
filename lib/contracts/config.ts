import { sepolia } from "wagmi/chains";
import type { Address } from "viem";

/**
 * Le contrat garde `i_stablecoin` en `private immutable` et n'expose aucun accesseur :
 * l'adresse du jeton ne peut pas être lue depuis la chaîne, elle doit être configurée.
 */
function requireAddress(nom: string, valeur: string | undefined): Address {
  if (!valeur || !/^0x[0-9a-fA-F]{40}$/.test(valeur)) {
    throw new Error(
      `Variable d'environnement ${nom} absente ou mal formée. ` +
        `Renseignez-la dans .env.local (voir .env.example).`
    );
  }
  return valeur as Address;
}

export const CHAIN = sepolia;

export const PAYROLL_ADDRESS = requireAddress(
  "NEXT_PUBLIC_PAYROLL_ADDRESS",
  process.env.NEXT_PUBLIC_PAYROLL_ADDRESS
);

export const TOKEN_ADDRESS = requireAddress(
  "NEXT_PUBLIC_TOKEN_ADDRESS",
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS
);

/** MockUSDC surcharge `decimals()` à 6, comme l'USDC réel. Vérifié dans test/mocks/MockUSDC.sol. */
export const TOKEN_DECIMALS = 6;
export const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? "mUSDC";

export const EXPLORER_BASE = CHAIN.blockExplorers.default.url;

export const explorerAddress = (a: string) => `${EXPLORER_BASE}/address/${a}`;
export const explorerTx = (h: string) => `${EXPLORER_BASE}/tx/${h}`;

/**
 * Bloc de création du contrat, relevé dans
 * `broadcast/DeployPayroll.s.sol/11155111/run-latest.json`. Il borne par le bas
 * la reconstitution de l'historique : avant ce bloc, l'adresse ne portait aucun
 * code et ne pouvait donc émettre aucun événement. Sans cette borne, il faut
 * remonter à l'aveugle une profondeur arbitraire, et payer chaque tranche
 * inutile d'autant de requêtes qu'il y a de signatures d'événements.
 */
export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK ?? "0");

/**
 * Point d'accès dédié à la lecture des journaux.
 *
 * Les limites d'un fournisseur ne sont pas les mêmes selon l'appel. Mesuré le
 * 24/09/2026 sur ce contrat : le palier gratuit d'Alchemy plafonne `eth_getLogs`
 * à dix blocs — treize mille requêtes pour la vie du contrat — là où ses limites
 * d'appel ordinaires sont confortables. La passerelle publique de Tenderly, elle,
 * rend l'historique entier en une requête.
 *
 * On sépare donc les deux usages plutôt que de dégrader l'un pour servir l'autre.
 * À écarter : le point d'accès publicnode, qui répond sans erreur mais ne rend
 * que les journaux récents — une troncature silencieuse, pire qu'un refus.
 */
export const LOGS_RPC_URL =
  process.env.NEXT_PUBLIC_LOGS_RPC_URL || "https://sepolia.gateway.tenderly.co";
