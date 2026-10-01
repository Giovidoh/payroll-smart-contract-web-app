"use client";

import { useEffect, useState } from "react";
import { useSettings } from "./use-payroll";

/**
 * Échéance de la prochaine paie.
 *
 * Le contrat n'interdit que de payer *trop tôt* : passé l'intervalle, la paie
 * reste exécutable indéfiniment. Le compte à rebours mesure donc le délai avant
 * qu'elle devienne possible, jamais un retard — c'est précisément l'asymétrie
 * relevée au 6.4 du mémoire, où l'article 164 protège le salarié contre le
 * retard et le garde-temps, lui, contre l'avance.
 */
export function useDueDate() {
  const { interval, lastPayroll, reservedCycles, busy } = useSettings();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const next =
    interval !== undefined && lastPayroll !== undefined
      ? Number(lastPayroll + interval)
      : undefined;

  const remaining = next !== undefined ? next - now : undefined;

  return {
    busy,
    interval,
    reservedCycles,
    lastPayroll,
    /** Horodatage, en secondes, à partir duquel `runPayroll()` cesse de rejeter. */
    next,
    /** Secondes restantes ; négatif une fois l'échéance passée. */
    remaining,
    /** Vrai dès que le garde-temps ne s'oppose plus à l'exécution. */
    isDue: remaining !== undefined ? remaining <= 0 : undefined,
    /** Depuis combien de temps la paie est exécutable sans l'avoir été. */
    delay: remaining !== undefined && remaining < 0 ? -remaining : 0,
  };
}
