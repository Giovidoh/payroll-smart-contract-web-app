import "server-only";

import mysql from "mysql2/promise";
import { DATABASE_URL } from "./env";

/**
 * Pool de connexions MySQL.
 *
 * En développement, Next recharge les modules à chaque modification. Un pool
 * créé au niveau du module serait donc recréé sans que le précédent soit fermé,
 * jusqu'à épuisement des connexions du serveur. On le range sur l'objet global,
 * qui, lui, survit au rechargement.
 */
const cle = Symbol.for("paie-blockchain.pool-mysql");

type Porteur = typeof globalThis & { [cle]?: mysql.Pool };

function creer(): mysql.Pool {
  return mysql.createPool({
    uri: DATABASE_URL,
    connectionLimit: 10,
    waitForConnections: true,
    // Les DATE et DATETIME reviennent en chaînes plutôt qu'en objets Date : la
    // conversion implicite appliquerait le fuseau du serveur à une date
    // d'embauche qui n'en a pas.
    dateStrings: true,
    namedPlaceholders: true,
  });
}

export const pool: mysql.Pool = ((globalThis as Porteur)[cle] ??= creer());

/**
 * Valeurs admises comme paramètre d'une requête préparée. Le type est
 * volontairement étroit : accepter `unknown` laisserait passer un objet qui
 * serait sérialisé en `[object Object]` sans que rien ne le signale.
 */
type Valeur = string | number | bigint | boolean | Date | null;
type Parametres = Record<string, Valeur>;

/** Lecture typée. Les requêtes sont préparées : les valeurs ne sont jamais concaténées. */
export async function lire<T>(sql: string, valeurs?: Parametres): Promise<T[]> {
  const [lignes] = await pool.execute(sql, valeurs ?? {});
  return lignes as T[];
}

/** Écriture. Renvoie le nombre de lignes touchées et, le cas échéant, la clef engendrée. */
export async function ecrire(
  sql: string,
  valeurs?: Parametres
): Promise<{ touchees: number; id: number }> {
  const [resultat] = await pool.execute(sql, valeurs ?? {});
  const r = resultat as mysql.ResultSetHeader;
  return { touchees: r.affectedRows, id: r.insertId };
}
