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
const key = Symbol.for("paie-blockchain.pool-mysql");

type GlobalWithPool = typeof globalThis & { [key]?: mysql.Pool };

function createPool(): mysql.Pool {
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

export const pool: mysql.Pool = ((globalThis as GlobalWithPool)[key] ??= createPool());

/**
 * Valeurs admises comme paramètre d'une requête préparée. Le type est
 * volontairement étroit : accepter `unknown` laisserait passer un objet qui
 * serait sérialisé en `[object Object]` sans que rien ne le signale.
 */
type QueryValue = string | number | bigint | boolean | Date | null;
type QueryParams = Record<string, QueryValue>;

/** Lecture typée. Les requêtes sont préparées : les valeurs ne sont jamais concaténées. */
export async function read<T>(sql: string, values?: QueryParams): Promise<T[]> {
  const [rows] = await pool.execute(sql, values ?? {});
  return rows as T[];
}

/** Écriture. Renvoie le nombre de lignes touchées et, le cas échéant, la clef engendrée. */
export async function write(
  sql: string,
  values?: QueryParams
): Promise<{ affected: number; id: number }> {
  const [result] = await pool.execute(sql, values ?? {});
  const r = result as mysql.ResultSetHeader;
  return { affected: r.affectedRows, id: r.insertId };
}
