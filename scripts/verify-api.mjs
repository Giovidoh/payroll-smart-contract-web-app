// Vérifie l'authentification et le cloisonnement des rôles
// contre le serveur de développement.
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

const BASE = "http://localhost:3000";
const compte = privateKeyToAccount(generatePrivateKey());

let cookie = "";
const appel = async (chemin, init = {}) => {
  const r = await fetch(BASE + chemin, {
    ...init,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...init.headers },
  });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  let corps;
  try { corps = await r.json(); } catch { corps = null; }
  return { statut: r.status, corps };
};

const verifier = (nom, condition, detail = "") => {
  console.log(`${condition ? "  OK  " : " ECHEC"}  ${nom}${detail ? "  — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
};

console.log(`Compte jetable : ${compte.address}\n`);

// 1. Aléa
const { corps: n1 } = await appel("/api/auth/nonce", { method: "POST" });
verifier("l'aléa est engendré", typeof n1?.alea === "string" && n1.alea.length === 32);

// 2. Message EIP-4361 signé
const message = createSiweMessage({
  address: compte.address,
  chainId: 11155111,
  domain: "localhost:3000",
  nonce: n1.alea,
  uri: BASE,
  version: "1",
  statement: "Authentification a l'application de paie.",
});
const signature = await compte.signMessage({ message });

const { statut: s2, corps: c2 } = await appel("/api/auth/session", {
  method: "POST",
  body: JSON.stringify({ message, signature }),
});
verifier("la session s'ouvre sur signature valide", s2 === 200, `statut ${s2} ${JSON.stringify(c2)}`);
verifier("l'adresse renvoyee est la bonne", c2?.adresse === compte.address.toLowerCase());

// 3. Rejeu du meme alea
const { statut: s3 } = await appel("/api/auth/session", {
  method: "POST",
  body: JSON.stringify({ message, signature }),
});
verifier("le rejeu du meme alea est refuse", s3 === 401, `statut ${s3}`);

// 3 bis. Message signe pour un autre domaine, presente avec l'en-tete Host
// correspondant. Le serveur doit refuser : le domaine attendu est epingle dans
// sa configuration et ne se deduit pas de la requete. Sans cela, une signature
// obtenue sur un site d'hameconnage serait acceptee ici.
{
  const { corps: n } = await appel("/api/auth/nonce", { method: "POST" });
  const menteur = createSiweMessage({
    address: compte.address,
    chainId: 11155111,
    domain: "hameconnage.example",
    nonce: n.alea,
    uri: "https://hameconnage.example",
    version: "1",
  });
  const sig = await compte.signMessage({ message: menteur });
  const garde = cookie;
  cookie = "";
  const { statut } = await appel("/api/auth/session", {
    method: "POST",
    headers: { host: "hameconnage.example" },
    body: JSON.stringify({ message: menteur, signature: sig }),
  });
  verifier("un message signe pour un autre domaine est refuse", statut === 401, `statut ${statut}`);
  cookie = garde;
}

// 4. Lecture : ni proprietaire ni salarie -> liste vide, pas un refus
const { statut: s4, corps: c4 } = await appel("/api/employees");
verifier("la lecture aboutit", s4 === 200, `statut ${s4}`);
verifier("aucune fiche n'est divulguee", Array.isArray(c4?.fiches) && c4.fiches.length === 0,
  JSON.stringify(c4));

// 5. Ecriture : reservee au proprietaire
const { statut: s5, corps: c5 } = await appel(`/api/employees/${compte.address}`, {
  method: "PUT",
  body: JSON.stringify({ nom: "Test", prenom: "Sonde", poste: "", email: "", embauche: "" }),
});
verifier("l'ecriture est refusee a un non-proprietaire", s5 === 403, `statut ${s5} ${JSON.stringify(c5)}`);

// 6. Cookie falsifie
const vrai = cookie;
cookie = vrai.slice(0, -4) + "0000";
const { statut: s6 } = await appel("/api/employees");
verifier("un cookie falsifie est rejete", s6 === 401, `statut ${s6}`);
cookie = vrai;

// 7. Registre accessible, vide
const { statut: s7, corps: c7 } = await appel("/api/payslips");
verifier("le registre repond", s7 === 200 && Array.isArray(c7?.bulletins), `statut ${s7}`);

// 7 bis. Registre de paie : inscription d'un bulletin.
//
// Le compte jetable n'a aucune fiche : l'inscription doit etre refusee, la
// chaine payant des adresses et le registre nommant des personnes. On seme
// ensuite une fiche directement en base pour verifier le chemin complet, y
// compris l'idempotence — reemettre un bulletin n'ajoute pas une ligne, le
// registre attestant un versement et non un telechargement.
const hachage = "0x" + "ab".repeat(32);

{
  const { statut, corps } = await appel("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ adresse: compte.address, hash: hachage, numeroLog: 3 }),
  });
  verifier("sans identite, le bulletin n'est pas inscrit", statut === 409, `statut ${statut}`);
  if (statut !== 409) console.log("   ", JSON.stringify(corps));
}

{
  const { statut } = await appel("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ adresse: compte.address, hash: "0x12", numeroLog: 3 }),
  });
  verifier("un hachage mal forme est refuse", statut === 400, `statut ${statut}`);
}

const mysql = await import("mysql2/promise").then((m) => m.default);
const bd = await mysql.createConnection(process.env.DATABASE_URL);
const contrat = process.env.NEXT_PUBLIC_PAYROLL_ADDRESS.toLowerCase();
const adresse = compte.address.toLowerCase();
try {
  await bd.execute(
    "INSERT INTO Employe (adresse_contrat, adresse_ethereum, nom, prenom) VALUES (?, ?, 'Sonde', 'Verif')",
    [contrat, adresse]
  );

  const { statut: sa } = await appel("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ adresse: compte.address, hash: hachage, numeroLog: 3 }),
  });
  verifier("le bulletin est inscrit au registre", sa === 200, `statut ${sa}`);

  const { statut: sb } = await appel("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ adresse: compte.address, hash: hachage, numeroLog: 3 }),
  });
  verifier("la reinscription est idempotente", sb === 200, `statut ${sb}`);

  const [compte_lignes] = await bd.execute(
    `SELECT COUNT(*) AS n FROM BulletinPaie b JOIN Employe e ON e.id = b.employe_id
      WHERE e.adresse_ethereum = ? AND b.hash_transaction = ?`,
    [adresse, hachage]
  );
  verifier("une seule ligne en base pour deux emissions",
    compte_lignes[0].n === 1, `${compte_lignes[0].n} ligne(s)`);

  const { corps: reg } = await appel("/api/payslips");
  const vu = (reg?.bulletins ?? []).find(
    (b) => b.hash_transaction === hachage && b.numero_log === 3
  );
  verifier("le salarie relit son bulletin dans le registre", Boolean(vu), JSON.stringify(vu));

  const { statut: sc } = await appel("/api/payslips", {
    method: "POST",
    body: JSON.stringify({
      adresse: "0x000000000000000000000000000000000000dEaD",
      hash: hachage,
      numeroLog: 4,
    }),
  });
  verifier("nul n'inscrit le bulletin d'autrui", sc === 403, `statut ${sc}`);
} finally {
  // La sonde ne laisse rien derriere elle : la cascade emporte les bulletins.
  await bd.execute("DELETE FROM Employe WHERE adresse_ethereum = ?", [adresse]);
  await bd.end();
}

// 8. Deconnexion
const { statut: s8 } = await appel("/api/auth/session", { method: "DELETE" });
verifier("la session se ferme", s8 === 200);
const { statut: s9 } = await appel("/api/employees");
verifier("apres deconnexion, la lecture est refusee", s9 === 401, `statut ${s9}`);
