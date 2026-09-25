import "server-only";

/**
 * Configuration serveur. Ces variables ne portent pas le préfixe `NEXT_PUBLIC_`
 * et ne partent donc jamais dans le paquet du navigateur — à la différence de la
 * clef du fournisseur RPC, qui y figure nécessairement puisque c'est le client
 * qui lit la chaîne.
 */
function requis(nom: string): string {
  const v = process.env[nom];
  if (!v) {
    throw new Error(
      `Variable d'environnement ${nom} absente. Renseignez-la dans .env.local ` +
        `(voir .env.example).`
    );
  }
  return v;
}

export const DATABASE_URL = requis("DATABASE_URL");

/**
 * Clef de signature du cookie de session. Une valeur changée invalide toutes les
 * sessions en cours, ce qui est le comportement recherché.
 */
export const SESSION_SECRET = requis("SESSION_SECRET");

/** Durée de validité d'une session, en secondes. */
export const SESSION_TTL = 60 * 60 * 8;

/** Durée de validité d'un aléa d'authentification, en secondes. */
export const NONCE_TTL = 5 * 60;
