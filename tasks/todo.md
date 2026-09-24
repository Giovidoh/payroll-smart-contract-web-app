# TODO — application web de gestion de la paie

Support Web2 du mémoire LP3. Le contrat `Payroll.sol` est déployé sur Sepolia
(`0x68B5Fc5B4B57dFBEE5d295BA25da36790aA68340`, bloc 11642468) ; cette application
en est l'interface. Maquette de référence : projet Claude Design « Arbitrage
système Modernist », fichier `Paie Blockchain.dc.html`.

**Règle de marquage** : `[x]` exige d'avoir vu l'écran rendu avec des données de
la chaîne, pas seulement d'avoir écrit le composant.

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

## Contraintes relevées sur les points d'accès au réseau (mesurées le 24/09/2026)

- Une lecture `eth_call` n'a **pas d'expéditeur** par défaut : toute fonction `view`
  gardée par `msg.sender` exige que l'appelant déclare `account`/`from`. C'est aussi
  pourquoi ces fonctions sont invisibles depuis l'onglet « Read Contract » d'Etherscan.
- Les plafonds de `eth_getLogs` diffèrent d'un fournisseur à l'autre, et l'écart est
  considérable : Alchemy (gratuit) 10 blocs, 1rpc 50, thirdweb 1 000, Tenderly la vie
  entière du contrat.
- **publicnode répond sans erreur mais ne rend que les journaux récents** — 4 événements
  sur 13. Une troncature silencieuse est plus dangereuse qu'un refus : à écarter.

## In Progress

- [~] Recette de bout en bout, écran par écran, sur le contrat de démonstration

## Done — vu à l'écran, avec des données de la chaîne

- [x] Socle : boilerplate `Giovidoh/nextjs-boilerplate`, authentification retirée
      (notre authentification est le portefeuille)
- [x] Dépendances web3 : wagmi, viem, découverte EIP-6963 des portefeuilles
- [x] Palette et typographies de la maquette, thème clair et sombre
- [x] ABI typée générée depuis `out/Payroll.sol/Payroll.json`
- [x] Magasin hors chaîne des identités salariés
- [x] Un chemin par écran, état déduit de l'URL, rechargement sans perte de position
- [x] A1 connexion — portefeuille détecté, erreur de connexion affichée
- [x] B1 vue d'ensemble — effectif 2, masse 3 250, solde 93 500, surplus 83 750
- [x] B2 salariés — tableau, recherche, tri
- [x] B3 ajouter un salarié — formulaire rendu
- [x] B6 trésorerie — réserve 9 750 vs surplus 83 750, dépôt et retrait
- [x] B7 exécution de la paie — contrôles préalables, bénéficiaires, solde après opération
- [x] B8 historique — 13 événements reconstitués, recoupés entre deux fournisseurs
- [x] B9 paramètres — intervalle 10 s, 3 cycles réservés, transfert de propriété en deux temps
- [x] C1 vue d'ensemble salarié — salaire lu en chaîne, compte à rebours
- [x] C2 mes versements
- [x] C3 mes bulletins
- [x] C4 mon profil — identité hors chaîne, note de confidentialité
- [x] D1/D2 — confirmation puis attente de signature

## To Do

### Écrans jamais rendus
- [ ] A2 mauvais réseau — basculer MetaMask sur un autre réseau pour le déclencher
- [ ] A3 adresse inconnue — connecter une adresse ni propriétaire ni salariée
- [ ] B4 modifier un salaire — écran atteint, opération jamais exécutée
- [ ] B5 retirer un salarié — idem
- [ ] C5 déclencher la paie depuis le compte salarié — **bloqué**, voir plus bas
- [ ] D3/D4 — succès et échec d'une transaction

### Reste à faire
- [ ] Décodage des 15 erreurs personnalisées en messages français (partiel)
- [ ] Cause de la boucle de requêtes observée en début de session, jamais établie
- [ ] Tests
- [ ] Surfacer les erreurs restantes : `useSwitchChain`, `useDisconnect`

## Blocked

- [!] C5 « Déclencher la paie » depuis le compte salarié — le compte
      `0x2c6DD1bBB1ff2F52DcBd35bA0fE84A83bB1B59Fd` n'a **aucun SepoliaETH** et ne peut
      pas payer les frais de réseau. Robinet Sepolia, ou envoi depuis le compte
      propriétaire. C'est l'écran qui porte l'argument du caractère permissionless.
