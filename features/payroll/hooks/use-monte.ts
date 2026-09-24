"use client";

import { useSyncExternalStore } from "react";

const sAbonner = () => () => {};

/**
 * Vrai une fois l'hydratation faite.
 *
 * Le rendu serveur ignore tout du portefeuille : sans ce garde-fou, le serveur
 * produirait l'écran de connexion et le client, immédiatement après, l'espace
 * connecté — ce que React signale comme une divergence d'hydratation.
 * `useSyncExternalStore` répond `false` au serveur et `true` au client sans
 * passer par un effet.
 */
export function useMonte() {
  return useSyncExternalStore(
    sAbonner,
    () => true,
    () => false
  );
}
