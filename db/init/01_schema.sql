-- ============================================================
-- SCHEMA: Archives Lépine Versailles
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLE USERS
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  nom text,
  prenom text,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'archiviste', 'consultation')),
  actif boolean DEFAULT true,
  deleted_at timestamp,
  created_at timestamptz DEFAULT now()
);

-- 2. TABLES MÉTIER
CREATE TABLE salles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  actif boolean DEFAULT true,
  deleted_at timestamp
);

CREATE TABLE etageres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid REFERENCES salles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  nombre_rangees integer DEFAULT 5,
  actif boolean DEFAULT true,
  deleted_at timestamp
);

CREATE TABLE categories_cnil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL,
  section text NOT NULL,
  details text,
  duree_base_active text,
  duree_archivage_intermediaire text,
  duree_archivage_mois integer,
  type_date_reference text,
  obligatoire boolean DEFAULT false,
  fondement_juridique text,
  source text,
  date_maj date DEFAULT CURRENT_DATE,
  type_precision text,
  delai_apres_evenement_mois integer,
  options_duree jsonb,
  actif boolean DEFAULT true,
  deleted_at timestamp
);

CREATE TABLE cartons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  salle_id uuid REFERENCES salles(id),
  etagere_id uuid REFERENCES etageres(id),
  emplacement text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carton_id uuid REFERENCES cartons(id) ON DELETE CASCADE,
  theme text NOT NULL,
  categorie_cnil_id uuid REFERENCES categories_cnil(id),
  description text,
  annee_document integer,
  type_date text,
  date_reference date,
  date_limite_conservation date,
  obligatoire boolean DEFAULT false,
  fondement_juridique text,
  observations text,
  date_precise date,
  date_evenement date,
  duree_mois_saisie integer,
  procedure_close boolean,
  a_completer boolean DEFAULT false,
  detruit boolean DEFAULT false,
  created_by uuid REFERENCES users(id),
  session_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE destructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  date_destruction date NOT NULL,
  effectue_par uuid REFERENCES users(id),
  methode text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- LOT F — COMPTEURS ATOMIQUES
CREATE TABLE compteurs_numerotation (
  prefixe text PRIMARY KEY,
  dernier_numero integer NOT NULL DEFAULT 0
);
INSERT INTO compteurs_numerotation (prefixe, dernier_numero) VALUES ('SS', 0), ('R1', 0), ('RDC', 0) ON CONFLICT DO NOTHING;

-- LOT G — AUDIT
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  table_concernee text NOT NULL,
  enregistrement_id uuid,
  details jsonb,
  created_at timestamp DEFAULT now()
);

-- LOT I — REFRESH TOKENS
CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  token_hash text NOT NULL,
  session_id uuid,
  expires_at timestamp NOT NULL,
  revoked boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_documents_carton_id ON documents(carton_id);
CREATE INDEX idx_documents_date_limite ON documents(date_limite_conservation);
CREATE INDEX idx_documents_detruit ON documents(detruit) WHERE detruit = false;
CREATE INDEX idx_documents_a_completer ON documents(a_completer) WHERE a_completer = true;
CREATE INDEX idx_documents_categorie_cnil_id ON documents(categorie_cnil_id);
CREATE INDEX idx_documents_theme ON documents(theme);
CREATE INDEX idx_cartons_salle_id ON cartons(salle_id);
CREATE INDEX idx_cartons_numero ON cartons(numero);
CREATE INDEX idx_etageres_salle_id ON etageres(salle_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_concernee, enregistrement_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 4. FONCTION NUMÉROTATION ATOMIQUE
CREATE OR REPLACE FUNCTION generate_numero_carton(prefix text)
RETURNS text AS $$
DECLARE next_num integer;
BEGIN
  UPDATE compteurs_numerotation SET dernier_numero = dernier_numero + 1
  WHERE prefixe = prefix RETURNING dernier_numero INTO next_num;
  IF next_num IS NULL THEN
    INSERT INTO compteurs_numerotation (prefixe, dernier_numero) VALUES (prefix, 1);
    next_num := 1;
  END IF;
  RETURN prefix || '-' || lpad(next_num::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. VUE DOCUMENTS COMPLETS
CREATE OR REPLACE VIEW v_documents_complets AS
SELECT
  d.id, d.carton_id, d.theme, d.categorie_cnil_id,
  d.description, d.annee_document, d.type_date,
  d.date_reference, d.date_limite_conservation,
  d.obligatoire, d.fondement_juridique, d.observations,
  d.date_precise, d.date_evenement, d.duree_mois_saisie,
  d.procedure_close, d.a_completer, d.detruit,
  d.created_by, d.created_at, d.updated_at,
  c.numero AS carton_numero, c.salle_id, c.etagere_id, c.emplacement,
  s.nom AS salle_nom, e.nom AS etagere_nom,
  cat.categorie, cat.section AS categorie_section,
  cat.duree_archivage_mois, cat.type_date_reference,
  cat.type_precision, cat.delai_apres_evenement_mois, cat.options_duree
FROM documents d
LEFT JOIN cartons c ON d.carton_id = c.id
LEFT JOIN salles s ON c.salle_id = s.id
LEFT JOIN etageres e ON c.etagere_id = e.id
LEFT JOIN categories_cnil cat ON d.categorie_cnil_id = cat.id;

-- 6. TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. SALLES INITIALES
INSERT INTO salles (nom, actif) VALUES
  ('Sous-sol', true),
  ('1er étage', true),
  ('RDC - Bureau Agathe', true);
