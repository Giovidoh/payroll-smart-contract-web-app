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

- [~] Recette de bout en bout — reste B5 et les écrans D3/D4

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
- [x] A2 mauvais réseau — « Basculer sur Sepolia », relevé depuis un autre réseau
- [x] A3 adresse non reconnue — quatrième compte, ni propriétaire ni salarié
- [x] B4 modifier un salaire — opération exécutée sur la chaîne
- [x] C5 déclencher la paie depuis un compte salarié — passe avec des frais
      provisionnés, échoue sans. Le caractère permissionless est vérifié dans
      les deux sens : le contrat n'oppose rien, le réseau oppose ses frais.
- [x] Couche hors chaîne MySQL — conteneur, schéma, huit points d'accès.
      12 contrôles de `npm run verify:api` passés contre la base et la chaîne
      réelles : rejeu d'aléa, domaine EIP-4361 usurpé, cookie falsifié, écriture
      refusée à un non-propriétaire, cloisonnement des lectures.
- [x] Authentification par signature de portefeuille (EIP-4361) — écran de
      signature à l'entrée, session scellée par HMAC, rôle lu sur la chaîne
- [x] Bascule du répertoire du `localStorage` vers l'API, ancien magasin supprimé
- [x] B10 modifier l'identité hors chaîne — écrit en base, accents compris
      (`Développeur` relu en `44C3A976…`, 11 caractères pour 12 octets)

## To Do

### Écrans jamais rendus
- [ ] B5 retirer un salarié — écran atteint, opération jamais exécutée
- [ ] D3/D4 — succès et échec d'une transaction

### Exigences du cahier des charges
Toutes closes. Les deux dernières, déplacées ci-dessous.

- [x] **SF-08** éditer et télécharger les bulletins d'un cycle (employeur).
      Colonne « Bulletin » en B8 : un bouton par versement, un bouton « Tout le
      cycle » sur `PayrollCompleted`. Chemin propriétaire exercé à l'écran.
- [x] Consigner l'émission au registre `BulletinPaie` depuis l'interface.
      Chemin mesuré de bout en bout par `npm run verify:api`, qui compte
      désormais 19 contrôles : inscription refusée sans identité (409),
      hachage mal formé refusé (400), inscription aboutie, idempotence
      vérifiée en base (deux émissions, une seule ligne), relecture par le
      salarié, inscription du bulletin d'autrui refusée (403). La sonde
      efface sa fiche : la table est revenue à zéro ligne.

### Mémoire, à reprendre une fois la recette close
- [ ] Régénérer `Diagrammes/Modèle de données hors chaîne/` d'après le DDL
- [ ] 3.3.4 et 4.2.2 : décrire le schéma réellement déployé (quatre amendements)
- [ ] 5.5 : la section affirme que l'application web n'est pas réalisée
- [ ] CONCLUSION GÉNÉRALE : elle range « la remise d'un bulletin » parmi les
      trois exigences satisfaites, **sans la réserve** que portent le 6.3.2 et le
      tableau de conformité. À reprendre, dans un sens ou dans l'autre.
- [ ] 6.3.2 : verser l'argument de B10 — l'immutabilité prive de rectification
      les montants versés, non les identités, qui vivent hors chaîne

### Reste à faire
- [ ] Décodage des 15 erreurs personnalisées en messages français (partiel)
- [ ] Cause de la boucle de requêtes observée en début de session, jamais établie
- [ ] Tests
- [ ] Surfacer les erreurs restantes : `useSwitchChain`, `useDisconnect`

### Dette relevée, à reprendre après la recette
- [ ] **Rangement des composants.** L'intention de départ : `/components` à la
      racine pour l'interface réutilisable, `/features` pour ce qui appartient à
      une fonctionnalité. Aujourd'hui `features/payroll/components/ui-kit.tsx`
      concentre des briques génériques (`Panneau`, `Kpi`, `Tableau`, `Squelette`,
      `Requis`) qui n'ont rien de spécifique à la paie.
- [ ] **Nommage en anglais.** Fichiers et identifiants sont en français
      (`useRole`, `enCours`, `Salaries.tsx`, `CHEMINS`) alors que la convention
      du projet — et celle du contrat — est l'anglais. Seuls les libellés
      affichés doivent rester en français.
