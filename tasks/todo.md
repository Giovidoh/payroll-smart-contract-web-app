# TODO — application web de gestion de la paie

Support Web2 du mémoire LP3. Le contrat `Payroll.sol` est déployé sur Sepolia ;
cette application en est l'interface. Maquette de référence :
projet Claude Design « Arbitrage système Modernist », fichier `Paie Blockchain.dc.html`.

## Contraintes relevées dans le contrat (sources, pas suppositions)

- `i_stablecoin` est `private immutable` **sans accesseur** : l'adresse du jeton ne peut pas
  être lue depuis la chaîne, elle doit être configurée (`NEXT_PUBLIC_TOKEN_ADDRESS`).
- `struct Employee { address; uint256 salary; }` : la chaîne ne connaît **que** l'adresse et le
  salaire. Nom, poste, e-mail et date d'embauche n'existent nulle part on-chain et doivent
  vivre hors chaîne. C'est un choix qui sert l'argument du 6.4 sur la publicité des
  rémunérations, pas un contournement.
- `MockUSDC.decimals() == 6` (vérifié dans `test/mocks/MockUSDC.sol`).
- `getTotalSalaries()` est `onlyOwner` : elle **revert** pour un salarié, elle ne renvoie pas 0.
  Le cloisonnement des rôles doit être fonctionnel, pas cosmétique.
- `getEmployee(address)` est gardée par `Payroll__OnlyOwnerAndConcernedEmployeeCanAccess` :
  un salarié ne voit qu'une ligne, par construction.
- `runPayroll()` est **externe et non `onlyOwner`** : n'importe qui peut déclencher la paie.
  L'interface ne doit donc pas la présenter comme une prérogative de l'employeur.
- 15 erreurs personnalisées à décoder en messages lisibles.

## In Progress

- [~] Socle : boilerplate `Giovidoh/nextjs-boilerplate` installé, couche d'authentification
      retirée (notre authentification est le portefeuille)

## To Do

### Socle
- [ ] Dépendances web3 : wagmi, viem, connecteur injecté
- [ ] Palette et typographies de la maquette (Modernist : accent `#0d4f3c`, Archivo, IBM Plex Mono)
- [ ] ABI typée générée depuis `out/Payroll.sol/Payroll.json`
- [ ] Décodage des 15 erreurs personnalisées en messages français
- [ ] Magasin hors chaîne des identités salariés (nom, poste, e-mail, date d'embauche)

### Écrans — employeur
- [ ] A1/A2/A3 connexion : portefeuille, mauvais réseau, adresse inconnue
- [ ] B1 vue d'ensemble : compte à rebours, KPI, trésorerie, événements récents
- [ ] B2 salariés : tableau, recherche, tri
- [ ] B3/B4/B5 : ajouter, modifier un salaire, retirer
- [ ] B6 trésorerie : réserve immobilisée vs surplus retirable, dépôt, retrait
- [ ] B7 exécution de la paie : contrôles préalables puis `runPayroll()`
- [ ] B8 historique : événements filtrés et datés
- [ ] B9 paramètres

### Écrans — salarié
- [ ] C1 vue d'ensemble
- [ ] C2 mes versements
- [ ] C3 mes bulletins (PDF hors chaîne)
- [ ] C4 mon profil
- [ ] C5 déclencher la paie (permissionless, assumé comme tel)

### Transverse
- [ ] D1–D4 : cycle de vie d'une transaction (confirmation, attente, succès, échec)
- [ ] Tests
- [ ] Démonstration de bout en bout sur le contrat de démonstration (intervalle 10 s)

## Done

## Blocked
