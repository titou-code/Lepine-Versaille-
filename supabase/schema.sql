-- ============================================================
-- SCHEMA: Archives Lépine Versailles
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. TABLES
-- ------------------------------------------------------------

CREATE TABLE salles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  actif boolean DEFAULT true
);

CREATE TABLE etageres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid REFERENCES salles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  actif boolean DEFAULT true
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
  date_maj date DEFAULT CURRENT_DATE
);

CREATE TABLE cartons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  salle_id uuid REFERENCES salles(id),
  etagere_id uuid REFERENCES etageres(id),
  emplacement text,
  created_by uuid REFERENCES auth.users(id),
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
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text,
  prenom text,
  role text DEFAULT 'consultation' CHECK (role IN ('admin', 'archiviste', 'consultation')),
  actif boolean DEFAULT true
);

CREATE TABLE destructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  date_destruction date NOT NULL,
  effectue_par uuid REFERENCES auth.users(id),
  methode text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 2. INDEXES
-- ------------------------------------------------------------

CREATE INDEX idx_documents_carton ON documents(carton_id);
CREATE INDEX idx_documents_theme ON documents(theme);
CREATE INDEX idx_documents_date_limite ON documents(date_limite_conservation);
CREATE INDEX idx_cartons_salle ON cartons(salle_id);
CREATE INDEX idx_etageres_salle ON etageres(salle_id);

-- 3. FONCTION NUMÉROTATION AUTOMATIQUE
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_numero_carton(prefix text)
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num
  FROM cartons
  WHERE numero LIKE prefix || '-%';
  RETURN prefix || '-' || lpad(next_num::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. VUE DOCUMENTS COMPLETS
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW v_documents_complets AS
SELECT
  d.id,
  d.carton_id,
  d.theme,
  d.categorie_cnil_id,
  d.description,
  d.annee_document,
  d.type_date,
  d.date_reference,
  d.date_limite_conservation,
  d.obligatoire,
  d.fondement_juridique,
  d.observations,
  d.created_by,
  d.created_at,
  d.updated_at,
  c.numero AS carton_numero,
  c.salle_id,
  c.etagere_id,
  c.emplacement,
  s.nom AS salle_nom,
  e.nom AS etagere_nom,
  cat.categorie,
  cat.section AS categorie_section,
  cat.duree_archivage_mois,
  cat.type_date_reference
FROM documents d
LEFT JOIN cartons c ON d.carton_id = c.id
LEFT JOIN salles s ON c.salle_id = s.id
LEFT JOIN etageres e ON c.etagere_id = e.id
LEFT JOIN categories_cnil cat ON d.categorie_cnil_id = cat.id;

-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE salles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etageres ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_cnil ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartons ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE destructions ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (get_user_role() = 'admin');

-- SALLES
CREATE POLICY "salles_select" ON salles FOR SELECT USING (true);
CREATE POLICY "salles_insert" ON salles FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "salles_update" ON salles FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "salles_delete" ON salles FOR DELETE USING (get_user_role() = 'admin');

-- ETAGERES
CREATE POLICY "etageres_select" ON etageres FOR SELECT USING (true);
CREATE POLICY "etageres_insert" ON etageres FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "etageres_update" ON etageres FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "etageres_delete" ON etageres FOR DELETE USING (get_user_role() = 'admin');

-- CATEGORIES_CNIL (lecture seule pour tous)
CREATE POLICY "categories_cnil_select" ON categories_cnil FOR SELECT USING (true);
CREATE POLICY "categories_cnil_insert" ON categories_cnil FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "categories_cnil_update" ON categories_cnil FOR UPDATE USING (get_user_role() = 'admin');

-- CARTONS
CREATE POLICY "cartons_select" ON cartons FOR SELECT USING (true);
CREATE POLICY "cartons_insert" ON cartons FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'archiviste'));
CREATE POLICY "cartons_update" ON cartons FOR UPDATE USING (get_user_role() IN ('admin', 'archiviste'));
CREATE POLICY "cartons_delete" ON cartons FOR DELETE USING (get_user_role() = 'admin');

-- DOCUMENTS
CREATE POLICY "documents_select" ON documents FOR SELECT USING (true);
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'archiviste'));
CREATE POLICY "documents_update" ON documents FOR UPDATE USING (get_user_role() IN ('admin', 'archiviste'));
CREATE POLICY "documents_delete" ON documents FOR DELETE USING (get_user_role() = 'admin');

-- DESTRUCTIONS
CREATE POLICY "destructions_select" ON destructions FOR SELECT USING (true);
CREATE POLICY "destructions_insert" ON destructions FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'archiviste'));
CREATE POLICY "destructions_update" ON destructions FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "destructions_delete" ON destructions FOR DELETE USING (get_user_role() = 'admin');

-- 6. TRIGGER updated_at
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. AUTO-CREATE PROFILE ON SIGNUP
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, nom, prenom, role)
  VALUES (NEW.id, '', '', 'consultation');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
