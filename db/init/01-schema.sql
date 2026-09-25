-- ---------------------------------------------------------------------------
-- Modèle de données hors chaîne (figure 5 du mémoire, amendée).
--
-- Le contrat ne connaît qu'un couple { adresse, salaire }. Le nom, le poste,
-- la date d'embauche et l'adresse électronique n'existent nulle part en chaîne,
-- et ne doivent pas y être portés : la publicité des rémunérations est l'un des
-- griefs retenus contre l'inscription en chaîne (chapitre 6, SNF-12).
--
-- Quatre amendements à la figure 5 d'origine, chacun motivé :
--
--   1. `numero_log` ajouté. `runPayroll()` verse à tous les salariés dans UNE
--      transaction et émet autant d'événements `SalaryPaid` que de salariés.
--      Le seul hachage de transaction ne distingue donc pas deux bulletins d'un
--      même cycle. Il faut l'index du journal.
--
--   2. `chemin_pdf` retiré. Le bulletin est déterministe : même événement et
--      même identité produisent le même document, régénéré à la demande. Le
--      conserver ferait du fichier la pièce de référence, alors que la pièce
--      est l'enregistrement en chaîne (SNF-05).
--
--   3. `poste` et `date_embauche` ajoutés : saisis au formulaire d'embauche et
--      imprimés sur le bulletin, ils manquaient au modèle.
--
--   4. `adresse_contrat` ajoutée. Un contrat déployé ne peut pas être modifié :
--      toute correction passe par un redéploiement, ce qui est arrivé une fois
--      dans ce projet (section 5.5, unité de l'intervalle). Sans cloisonnement,
--      le personnel d'un déploiement serait silencieusement repris par le
--      suivant.
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Identité du salarié. Seule la colonne `adresse_ethereum` fait le lien avec
-- l'état du contrat sur la chaîne.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Employe (
  id               INT AUTO_INCREMENT PRIMARY KEY,

  -- Déploiement auquel la fiche se rapporte.
  adresse_contrat  VARCHAR(42)  NOT NULL,

  -- Adresse du salarié, conservée en minuscules pour que la comparaison ne
  -- dépende pas de la casse du format à empreinte (EIP-55).
  adresse_ethereum VARCHAR(42)  NOT NULL,

  nom              VARCHAR(80)  NOT NULL,
  prenom           VARCHAR(80)  NOT NULL,
  poste            VARCHAR(120) NOT NULL DEFAULT '',
  email            VARCHAR(160) NOT NULL DEFAULT '',
  date_embauche    DATE         NULL,

  date_creation    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_maj         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_employe (adresse_contrat, adresse_ethereum)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Registre de paie, au sens de l'article 166 du Code du travail togolais, qui
-- impose la délivrance d'un bulletin individuel ET la tenue d'un registre.
--
-- La table ne conserve ni montant ni date de versement : ces données viennent
-- exclusivement des événements de la chaîne, conformément au 4.2.2. Elle
-- consigne qu'un bulletin a été émis, pour qui, et contre quelle inscription.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS BulletinPaie (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  employe_id       INT          NOT NULL,

  -- Référence de l'événement `SalaryPaid` qui atteste le versement.
  hash_transaction CHAR(66)     NOT NULL,
  numero_log       INT          NOT NULL,

  date_emission    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_bulletin (hash_transaction, numero_log),
  KEY idx_bulletin_employe (employe_id),
  CONSTRAINT fk_bulletin_employe
    FOREIGN KEY (employe_id) REFERENCES Employe (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
