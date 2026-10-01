// Vérifie l'authentification et le cloisonnement des rôles
// contre le serveur de développement.
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

const BASE = "http://localhost:3000";
const account = privateKeyToAccount(generatePrivateKey());

let cookie = "";
const call = async (path, init = {}) => {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...init.headers },
  });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  let body;
  try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
};

const check = (name, condition, detail = "") => {
  console.log(`${condition ? "  OK  " : " ECHEC"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
};

console.log(`Compte jetable : ${account.address}\n`);

// 1. Aléa
const { body: n1 } = await call("/api/auth/nonce", { method: "POST" });
check("l'aléa est engendré", typeof n1?.nonce === "string" && n1.nonce.length === 32);

// 2. Message EIP-4361 signé
const message = createSiweMessage({
  address: account.address,
  chainId: 11155111,
  domain: "localhost:3000",
  nonce: n1.nonce,
  uri: BASE,
  version: "1",
  statement: "Authentification a l'application de paie.",
});
const signature = await account.signMessage({ message });

const { status: s2, body: b2 } = await call("/api/auth/session", {
  method: "POST",
  body: JSON.stringify({ message, signature }),
});
check("la session s'ouvre sur signature valide", s2 === 200, `statut ${s2} ${JSON.stringify(b2)}`);
check("l'adresse renvoyee est la bonne", b2?.address === account.address.toLowerCase());

// 3. Rejeu du meme alea
const { status: s3 } = await call("/api/auth/session", {
  method: "POST",
  body: JSON.stringify({ message, signature }),
});
check("le rejeu du meme alea est refuse", s3 === 401, `statut ${s3}`);

// 3 bis. Message signe pour un autre domaine, presente avec l'en-tete Host
// correspondant. Le serveur doit refuser : le domaine attendu est epingle dans
// sa configuration et ne se deduit pas de la requete. Sans cela, une signature
// obtenue sur un site d'hameconnage serait acceptee ici.
{
  const { body: n } = await call("/api/auth/nonce", { method: "POST" });
  const spoofed = createSiweMessage({
    address: account.address,
    chainId: 11155111,
    domain: "hameconnage.example",
    nonce: n.nonce,
    uri: "https://hameconnage.example",
    version: "1",
  });
  const sig = await account.signMessage({ message: spoofed });
  const saved = cookie;
  cookie = "";
  const { status } = await call("/api/auth/session", {
    method: "POST",
    headers: { host: "hameconnage.example" },
    body: JSON.stringify({ message: spoofed, signature: sig }),
  });
  check("un message signe pour un autre domaine est refuse", status === 401, `statut ${status}`);
  cookie = saved;
}

// 4. Lecture : ni proprietaire ni salarie -> liste vide, pas un refus
const { status: s4, body: b4 } = await call("/api/employees");
check("la lecture aboutit", s4 === 200, `statut ${s4}`);
check("aucune fiche n'est divulguee", Array.isArray(b4?.records) && b4.records.length === 0,
  JSON.stringify(b4));

// 5. Ecriture : reservee au proprietaire
const { status: s5, body: b5 } = await call(`/api/employees/${account.address}`, {
  method: "PUT",
  body: JSON.stringify({ lastName: "Test", firstName: "Sonde", jobTitle: "", email: "", hireDate: "" }),
});
check("l'ecriture est refusee a un non-proprietaire", s5 === 403, `statut ${s5} ${JSON.stringify(b5)}`);

// 6. Cookie falsifie
const genuine = cookie;
cookie = genuine.slice(0, -4) + "0000";
const { status: s6 } = await call("/api/employees");
check("un cookie falsifie est rejete", s6 === 401, `statut ${s6}`);
cookie = genuine;

// 7. Registre accessible, vide
const { status: s7, body: b7 } = await call("/api/payslips");
check("le registre repond", s7 === 200 && Array.isArray(b7?.payslips), `statut ${s7}`);

// 7 bis. Registre de paie : inscription d'un bulletin.
//
// Le compte jetable n'a aucune fiche : l'inscription doit etre refusee, la
// chaine payant des adresses et le registre nommant des personnes. On seme
// ensuite une fiche directement en base pour verifier le chemin complet, y
// compris l'idempotence — reemettre un bulletin n'ajoute pas une ligne, le
// registre attestant un versement et non un telechargement.
const txHash = "0x" + "ab".repeat(32);

{
  const { status, body } = await call("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ address: account.address, hash: txHash, logIndex: 3 }),
  });
  check("sans identite, le bulletin n'est pas inscrit", status === 409, `statut ${status}`);
  if (status !== 409) console.log("   ", JSON.stringify(body));
}

{
  const { status } = await call("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ address: account.address, hash: "0x12", logIndex: 3 }),
  });
  check("un hachage mal forme est refuse", status === 400, `statut ${status}`);
}

const mysql = await import("mysql2/promise").then((m) => m.default);
const db = await mysql.createConnection(process.env.DATABASE_URL);
const contract = process.env.NEXT_PUBLIC_PAYROLL_ADDRESS.toLowerCase();
const address = account.address.toLowerCase();
try {
  await db.execute(
    "INSERT INTO Employe (adresse_contrat, adresse_ethereum, nom, prenom) VALUES (?, ?, 'Sonde', 'Verif')",
    [contract, address]
  );

  const { status: sa } = await call("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ address: account.address, hash: txHash, logIndex: 3 }),
  });
  check("le bulletin est inscrit au registre", sa === 200, `statut ${sa}`);

  const { status: sb } = await call("/api/payslips", {
    method: "POST",
    body: JSON.stringify({ address: account.address, hash: txHash, logIndex: 3 }),
  });
  check("la reinscription est idempotente", sb === 200, `statut ${sb}`);

  const [rowCount] = await db.execute(
    `SELECT COUNT(*) AS n FROM BulletinPaie b JOIN Employe e ON e.id = b.employe_id
      WHERE e.adresse_ethereum = ? AND b.hash_transaction = ?`,
    [address, txHash]
  );
  check("une seule ligne en base pour deux emissions",
    rowCount[0].n === 1, `${rowCount[0].n} ligne(s)`);

  const { body: registry } = await call("/api/payslips");
  const seen = (registry?.payslips ?? []).find(
    (p) => p.txHash === txHash && p.logIndex === 3
  );
  check("le salarie relit son bulletin dans le registre", Boolean(seen), JSON.stringify(seen));

  const { status: sc } = await call("/api/payslips", {
    method: "POST",
    body: JSON.stringify({
      address: "0x000000000000000000000000000000000000dEaD",
      hash: txHash,
      logIndex: 4,
    }),
  });
  check("nul n'inscrit le bulletin d'autrui", sc === 403, `statut ${sc}`);
} finally {
  // La sonde ne laisse rien derriere elle : la cascade emporte les bulletins.
  await db.execute("DELETE FROM Employe WHERE adresse_ethereum = ?", [address]);
  await db.end();
}

// 8. Deconnexion
const { status: s8 } = await call("/api/auth/session", { method: "DELETE" });
check("la session se ferme", s8 === 200);
const { status: s9 } = await call("/api/employees");
check("apres deconnexion, la lecture est refusee", s9 === 401, `statut ${s9}`);
