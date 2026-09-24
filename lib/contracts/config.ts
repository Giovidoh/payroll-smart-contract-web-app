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
