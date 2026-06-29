-- ============================================================
-- SEED: Catégories CNIL — Référentiel complet
-- À exécuter APRÈS schema.sql
-- ============================================================

INSERT INTO categories_cnil (categorie, section, duree_archivage_mois, type_date_reference, obligatoire, fondement_juridique) VALUES

-- RH — Recrutement
('Gestion des candidats — candidat RETENU', 'Recrutement', NULL, 'Date du document', false, 'Guide recrutement CNIL'),
('Gestion des candidats — candidat NON RETENU', 'Recrutement', 60, 'Date du document', true, 'Art. L1134-5 du code du travail'),
('CV-thèque / vivier candidats', 'Recrutement', 60, 'Date fin de relation', false, 'Guide recrutement CNIL'),
('Contrôle de l''honorabilité', 'Recrutement', NULL, 'Date du document', true, 'Textes réglementaires applicables à chaque activité'),

-- RH — Gestion administrative
('Dossier professionnel', 'Gestion administrative', NULL, 'Date fin de relation', false, 'Référentiel GRH CNIL'),
('Registre unique du personnel', 'Gestion administrative', 60, 'Date fin de relation', true, 'Art. R1221-26 du code du travail'),
('Suivi du temps de travail — standard', 'Gestion administrative', 12, 'Date du document', true, 'Art. D3171-16 / L3245-1 du code du travail'),
('Suivi du temps de travail — convention forfait', 'Gestion administrative', 36, 'Date du document', true, 'Art. D3171-16 / L3245-1 du code du travail'),

-- RH — Rémunérations
('Bulletins de paie — éléments identification travailleur', 'Rémunérations', 72, 'Date du document', true, 'Art. L102B CGI / Art. L243-16 CSS'),
('Bulletins de paie — mise à disposition (papier ou électronique)', 'Rémunérations', 60, 'Date du document', true, 'Art. L3243-4 / Art. D3243-8 du code du travail'),
('Bulletins de paie — électronique (disponibilité longue durée)', 'Rémunérations', 600, 'Date du document', true, 'Art. L3243-4 / Art. D3243-8 du code du travail'),
('Cotisations et contributions sociales', 'Rémunérations', 72, 'Date du document', true, 'Art. L243-16 CSS'),
('Déclaration sociale nominative (DSN)', 'Rémunérations', 72, 'Date du document', true, 'Art. L243-16 CSS'),

-- RH — Accidents du travail
('Accidents du travail — déclaration', 'Accidents du travail', 60, 'Date du document', true, 'Art. D4711-3 du code du travail'),
('Accidents du travail — vérifications et contrôles', 'Accidents du travail', 60, 'Date du document', true, 'Art. D4711-3 du code du travail'),

-- RH — Relations collectives
('Mandats des représentants du personnel — nature et syndicat', 'Relations collectives', 72, 'Date fin de relation', true, 'Art. L2411-5 du code du travail'),
('Affichage composition CSE', 'Relations collectives', NULL, 'Date fin de relation', true, 'Art. R2314-22 du code du travail'),
('Congés spéciaux et heures de délégation', 'Relations collectives', 72, 'Date fin de relation', true, 'Art. 5 du RGPD'),
('Élections professionnelles — fichiers supports (vote électronique)', 'Relations collectives', NULL, 'Date du document', false, 'Recommandation CNIL vote électronique'),
('Élections professionnelles — autres modalités (correspondance postale)', 'Relations collectives', 4, 'Date du document', true, 'Art. R2122-90 du code du travail'),

-- RH — Contentieux & Alertes
('Contentieux disciplinaire et prud''homal', 'Contentieux & Alertes', NULL, 'Date fin de relation', true, 'Art. 6 CEDH'),
('Alertes professionnelles — signalements', 'Contentieux & Alertes', NULL, 'Date du document', true, 'Loi n°2022-401 du 21 mars 2022'),

-- RH — Sécurité
('Contrôle des accès — non biométrique (données identification)', 'Sécurité', NULL, 'Date fin de relation', false, 'Fiche CNIL accès locaux'),
('Contrôle des accès — non biométrique (journalisation)', 'Sécurité', NULL, 'Date du document', false, 'Fiche CNIL accès locaux'),
('Contrôle des accès — biométrique (données identification)', 'Sécurité', 6, 'Date fin de relation', true, 'Règlement type Biométrie CNIL'),
('Contrôle des accès — biométrique (journalisation)', 'Sécurité', NULL, 'Date du document', true, 'Règlement type Biométrie CNIL'),
('Vidéosurveillance', 'Sécurité', NULL, 'Date du document', true, 'Art. 5-1e RGPD / Art. L252-5 CSI'),
('Traces, accès et actions informatiques (audits sécurité)', 'Sécurité', 12, 'Date du document', false, 'Délibération CNIL 2021-122'),

-- RH — Véhicules
('Véhicules — tachygraphes (personnel standard)', 'Véhicules', 12, 'Date du document', true, 'Règlement (UE) n°165/2014'),
('Véhicules — tachygraphes (aménagement temps de travail)', 'Véhicules', 12, 'Date du document', true, 'Art. D3171-16 du code du travail'),
('Véhicules — tachygraphes (convention forfait)', 'Véhicules', 36, 'Date du document', true, 'Art. D3171-16 du code du travail'),
('Véhicules — géolocalisation (optimisation tournées)', 'Véhicules', 12, 'Date du document', false, 'Fiche CNIL géolocalisation véhicules'),
('Véhicules — géolocalisation (facturation)', 'Véhicules', 12, 'Date du document', false, 'Fiche CNIL géolocalisation véhicules'),
('Véhicules — contraventions (désignation standard)', 'Véhicules', 12, 'Date du document', true, 'Art. L121-6 du code de la route'),

-- RH — Communication
('Écoute téléphonique — formation et qualité de service', 'Communication', 12, 'Date du document', false, 'Fiche CNIL écoute appels'),
('Écoute téléphonique — probatoire (formation contrat)', 'Communication', 60, 'Date du document', true, 'Art. 2224 du code civil'),

-- Santé — Dossiers patients (EHPAD)
('Dossier médical EHPAD / établissement public ou privé', 'Santé — Dossiers patients', 240, 'Date du document', true, 'Article R.1112-7 du Code de la Santé Publique'),
('Dossier transfusionnel', 'Santé — Dossiers patients', 360, 'Date du document', true, 'Article R.1112-7 CSP'),
('Dossier pharmaceutique — dispensation médicaments', 'Santé — Dossiers patients', 32, 'Date du document', true, 'Article R.111-20-12 CSP'),
('Dossier pharmaceutique — traces de refus', 'Santé — Dossiers patients', 36, 'Date du document', true, 'Article R.1111-20-3-1 CSP'),
('Dossier médical cabinet libéral', 'Santé — Dossiers patients', 120, 'Date du document', true, 'Article L.1142-28 CSP'),
('Clichés d''imagerie', 'Santé — Dossiers patients', 240, 'Date du document', true, 'Article R.1112-7 CSP'),
('Dossier administratif patient — éléments d''identification', 'Santé — Dossiers patients', 60, 'Date du document', true, 'Circulaire AD 94-2 du 18 Janvier 1994'),
('Dossier administratif patient — facturation', 'Santé — Dossiers patients', 60, 'Date du document', true, 'Circulaire AD 94-2 du 18 Janvier 1994'),
('Registre d''entrée et de sortie des patients', 'Santé — Dossiers patients', NULL, 'Date du document', true, 'Arrêté du 11 mars 1968'),
('Registre de répertoire des décès', 'Santé — Dossiers patients', 1200, 'Date du document', true, 'Article n°197 instruction générale état civil'),
('Registre et suivi des corps décédés', 'Santé — Dossiers patients', 600, 'Date du document', true, 'Arrêté du 5 janvier 2007'),
('Autorisation d''autopsie et de prélèvement d''organe', 'Santé — Dossiers patients', 60, 'Date du document', true, 'Article 1233-1 CSP'),
('Documents spécifiques aux malades sous tutelle', 'Santé — Dossiers patients', NULL, 'Date du document', true, 'Circulaire AD 94-2 du 18 Janvier 1994'),
('Laboratoires — dossier patient', 'Santé — Dossiers patients', 180, 'Date du document', false, 'Recommandation référentiel CNIL santé / Art. R.1131-20 CSP'),
('Laboratoires — analyses génétiques', 'Santé — Dossiers patients', 360, 'Date du document', false, 'Recommandation référentiel CNIL santé / Art. R.1131-20 CSP');
