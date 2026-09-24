// Régénère lib/contracts/payroll-abi.ts depuis l'artefact de compilation Foundry.
// Le dépôt du contrat est cherché dans CONTRACT_REPO, sinon à l'emplacement par défaut.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repo =
  process.env.CONTRACT_REPO ??
  "//wsl.localhost/Ubuntu/home/gidoh/projects/payroll-smart-contract";

const artefact = resolve(repo, "out/Payroll.sol/Payroll.json");
const { abi } = JSON.parse(readFileSync(artefact, "utf-8"));

const contenu = `// Généré depuis out/Payroll.sol/Payroll.json du dépôt payroll-smart-contract.
// Ne pas éditer à la main : régénérer avec \`npm run abi\`.

export const payrollAbi = ${JSON.stringify(abi, null, 2)} as const;
`;

writeFileSync(resolve("lib/contracts/payroll-abi.ts"), contenu, "utf-8");
console.log(`payroll-abi.ts régénéré : ${abi.length} entrées depuis ${artefact}`);
