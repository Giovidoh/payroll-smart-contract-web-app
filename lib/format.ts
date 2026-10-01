import { formatUnits, parseUnits } from "viem";
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "@/lib/contracts/config";

const nf2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Montant en unités de base du jeton → « 1 250,00 mUSDC ». */
export function formatToken(amount: bigint, withSymbol = true): string {
  const n = Number(formatUnits(amount, TOKEN_DECIMALS));
  return withSymbol ? `${nf2.format(n)} ${TOKEN_SYMBOL}` : nf2.format(n);
}

/** Saisie utilisateur « 1250,50 » → unités de base. Lève si la saisie est invalide. */
export function parseToken(input: string): bigint {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Montant invalide.");
  }
  return parseUnits(normalized, TOKEN_DECIMALS);
}

/** Comme `parseToken`, mais une saisie vide ou invalide donne `null` : pour un champ en cours de frappe. */
export function parseTokenOrNull(input: string): bigint | null {
  if (!input) return null;
  try {
    return parseToken(input);
  } catch {
    return null;
  }
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;

const df = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dtf = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Horodatage de bloc (secondes) → date française. */
export const formatDate = (seconds: bigint | number) =>
  df.format(new Date(Number(seconds) * 1000));

export const formatDateTime = (seconds: bigint | number) =>
  dtf.format(new Date(Number(seconds) * 1000));

/** Durée en secondes → « 12 j 04 h 31 min ». Retourne null si la durée est écoulée. */
export function formatCountdown(seconds: number): string | null {
  if (seconds <= 0) return null;
  const j = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (j > 0) return `${j} j ${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

/** Intervalle du contrat en secondes → « 30 jours », « 10 secondes ». */
export function formatInterval(seconds: bigint): string {
  const n = Number(seconds);
  if (n % 86400 === 0) {
    const j = n / 86400;
    return `${j} jour${j > 1 ? "s" : ""}`;
  }
  if (n % 3600 === 0) {
    const h = n / 3600;
    return `${h} heure${h > 1 ? "s" : ""}`;
  }
  if (n % 60 === 0) {
    const m = n / 60;
    return `${m} minute${m > 1 ? "s" : ""}`;
  }
  return `${n} seconde${n > 1 ? "s" : ""}`;
}
