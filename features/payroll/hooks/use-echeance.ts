"use client";

import { useEffect, useState } from "react";
import { useParametres } from "./use-payroll";

/**
 * Échéance de la prochaine paie.
 *
 * Le contrat n'interdit que de payer *trop tôt* : passé l'intervalle, la paie
 * reste exécutable indéfiniment. Le compte à rebours mesure donc le délai avant
 * qu'elle devienne possible, jamais un retard — c'est précisément l'asymétrie
 * relevée au 6.4 du mémoire, où l'article 164 protège le salarié contre le
 * retard et le garde-temps, lui, contre l'avance.
 */
export function useEcheance() {
  const { intervalle, dernierePaie, cyclesReserves, enCours } = useParametres();
  const [maintenant, setMaintenant] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const prochaine =
    intervalle !== undefined && dernierePaie !== undefined
      ? Number(dernierePaie + intervalle)
      : undefined;

  const restant = prochaine !== undefined ? prochaine - maintenant : undefined;

  return {
    enCours,
    intervalle,
    cyclesReserves,
    dernierePaie,
    /** Horodatage, en secondes, à partir duquel `runPayroll()` cesse de rejeter. */
    prochaine,
    /** Secondes restantes ; négatif une fois l'échéance passée. */
    restant,
    /** Vrai dès que le garde-temps ne s'oppose plus à l'exécution. */
    echue: restant !== undefined ? restant <= 0 : undefined,
    /** Depuis combien de temps la paie est exécutable sans l'avoir été. */
    retard: restant !== undefined && restant < 0 ? -restant : 0,
  };
}
