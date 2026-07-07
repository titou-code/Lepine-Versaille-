const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const uuid = () => crypto.randomUUID()
const adminHash = bcrypt.hashSync('admin', 10)
const now = () => new Date().toISOString()

const store = {
  users: [
    { id: uuid(), email: 'admin@lepine.fr', password_hash: adminHash, nom: 'Admin', prenom: 'Super', role: 'super_admin', actif: true, deleted_at: null, created_at: now() }
  ],
  salles: [
    { id: 's1', nom: 'Sous-sol', actif: true, deleted_at: null },
    { id: 's2', nom: '1er étage', actif: true, deleted_at: null },
    { id: 's3', nom: 'RDC - Bureau Agathe', actif: true, deleted_at: null },
  ],
  etageres: [
    { id: 'e1', salle_id: 's1', nom: 'Étagère SS-1', description: '', nombre_rangees: 5, actif: true, deleted_at: null },
    { id: 'e2', salle_id: 's2', nom: 'Étagère E1-1', description: '', nombre_rangees: 5, actif: true, deleted_at: null },
    { id: 'e3', salle_id: 's3', nom: 'Étagère RDC-1', description: '', nombre_rangees: 5, actif: true, deleted_at: null },
  ],
  categories_cnil: [],
  cartons: [],
  documents: [],
  destructions: [],
  audit_log: [],
  refresh_tokens: [],
  compteurs: { SS: 0, R1: 0, RDC: 0 },
}

const SECTION_THEME_MAP = {
  'Recrutement': 'RH', 'Gestion administrative': 'RH', 'Rémunérations': 'RH',
  'Accidents du travail': 'RH', 'Relations collectives': 'RH',
  'Contentieux & Alertes': 'Juridique', 'Sécurité': 'Sécurité',
  'Véhicules': 'RH', 'Communication': 'RH',
  'Santé — Dossiers patients': 'Médical',
}
const COMPTA_CATS = ['Cotisations et contributions sociales', 'Déclaration sociale nominative (DSN)']

function seedCategories() {
  const cats = [
    ['Gestion des candidats — candidat RETENU', 'Recrutement', null, 'Date du document', false, 'Guide recrutement CNIL', 'duree_variable', null, '[{"label":"Durée relation + 5 ans","mois":60}]'],
    ['Gestion des candidats — candidat NON RETENU', 'Recrutement', 60, 'Date du document', true, 'Art. L1134-5', null, null, null],
    ['CV-thèque / vivier candidats', 'Recrutement', 60, 'Date fin de relation', false, 'Guide recrutement CNIL', null, null, null],
    ['Contrôle de l\'honorabilité', 'Recrutement', null, 'Date du document', true, 'Textes réglementaires', 'duree_variable', null, '[{"label":"Attestation requise (12 mois)","mois":12},{"label":"Durée spécifique — à préciser","mois":null}]'],
    ['Dossier professionnel', 'Gestion administrative', null, 'Date fin de relation', false, 'Référentiel GRH CNIL', 'fin_habilitation', 0, null],
    ['Registre unique du personnel', 'Gestion administrative', 60, 'Date fin de relation', true, 'Art. R1221-26', null, null, null],
    ['Suivi du temps de travail — standard', 'Gestion administrative', 12, 'Date du document', true, 'Art. D3171-16', null, null, null],
    ['Suivi du temps de travail — convention forfait', 'Gestion administrative', 36, 'Date du document', true, 'Art. D3171-16', null, null, null],
    ['Bulletins de paie — éléments identification', 'Rémunérations', 72, 'Date du document', true, 'Art. L102B CGI', null, null, null],
    ['Bulletins de paie — mise à disposition', 'Rémunérations', 60, 'Date du document', true, 'Art. L3243-4', null, null, null],
    ['Bulletins de paie — électronique longue durée', 'Rémunérations', 600, 'Date du document', true, 'Art. L3243-4', null, null, null],
    ['Cotisations et contributions sociales', 'Rémunérations', 72, 'Date du document', true, 'Art. L243-16 CSS', null, null, null],
    ['Déclaration sociale nominative (DSN)', 'Rémunérations', 72, 'Date du document', true, 'Art. L243-16 CSS', null, null, null],
    ['Accidents du travail — déclaration', 'Accidents du travail', 60, 'Date du document', true, 'Art. D4711-3', null, null, null],
    ['Accidents du travail — vérifications', 'Accidents du travail', 60, 'Date du document', true, 'Art. D4711-3', null, null, null],
    ['Mandats des représentants du personnel', 'Relations collectives', 72, 'Date fin de relation', true, 'Art. L2411-5', 'fin_mandat', 6, null],
    ['Affichage composition CSE', 'Relations collectives', null, 'Date fin de relation', true, 'Art. R2314-22', 'fin_mandat', 0, null],
    ['Congés spéciaux et heures de délégation', 'Relations collectives', 72, 'Date fin de relation', true, 'Art. 5 RGPD', 'fin_mandat', 0, null],
    ['Élections professionnelles — vote électronique', 'Relations collectives', null, 'Date du document', false, 'Recommandation CNIL', 'fin_procedure', 0, null],
    ['Élections professionnelles — correspondance', 'Relations collectives', 4, 'Date du document', true, 'Art. R2122-90', null, null, null],
    ['Contentieux disciplinaire et prud\'homal', 'Contentieux & Alertes', null, 'Date fin de relation', true, 'Art. 6 CEDH', 'fin_procedure', 0, null],
    ['Alertes professionnelles — signalements', 'Contentieux & Alertes', null, 'Date du document', true, 'Loi n°2022-401', 'fin_procedure', 0, null],
    ['Contrôle des accès — non biométrique (identification)', 'Sécurité', null, 'Date fin de relation', false, 'Fiche CNIL', 'fin_habilitation', 0, null],
    ['Contrôle des accès — non biométrique (journalisation)', 'Sécurité', null, 'Date du document', false, 'Fiche CNIL', 'duree_variable', null, '[{"label":"3 mois glissants","mois":3},{"label":"Selon politique interne","mois":null}]'],
    ['Contrôle des accès — biométrique (identification)', 'Sécurité', 6, 'Date fin de relation', true, 'Règlement type Biométrie CNIL', 'fin_habilitation', 6, null],
    ['Contrôle des accès — biométrique (journalisation)', 'Sécurité', null, 'Date du document', true, 'Règlement type Biométrie CNIL', 'duree_variable', null, '[{"label":"6 mois glissants","mois":6},{"label":"Selon politique interne","mois":null}]'],
    ['Vidéosurveillance', 'Sécurité', null, 'Date du document', true, 'Art. 5-1e RGPD', 'duree_variable', null, '[{"label":"30 jours max","mois":1},{"label":"Durée autorisée par préfet","mois":null}]'],
    ['Traces et audits sécurité informatique', 'Sécurité', 12, 'Date du document', false, 'Délibération CNIL 2021-122', null, null, null],
    ['Véhicules — tachygraphes standard', 'Véhicules', 12, 'Date du document', true, 'Règlement (UE) n°165/2014', null, null, null],
    ['Véhicules — tachygraphes aménagement', 'Véhicules', 12, 'Date du document', true, 'Art. D3171-16', null, null, null],
    ['Véhicules — tachygraphes forfait', 'Véhicules', 36, 'Date du document', true, 'Art. D3171-16', null, null, null],
    ['Véhicules — géolocalisation tournées', 'Véhicules', 12, 'Date du document', false, 'Fiche CNIL géolocalisation', null, null, null],
    ['Véhicules — géolocalisation facturation', 'Véhicules', 12, 'Date du document', false, 'Fiche CNIL géolocalisation', null, null, null],
    ['Véhicules — contraventions', 'Véhicules', 12, 'Date du document', true, 'Art. L121-6', null, null, null],
    ['Écoute téléphonique — formation', 'Communication', 12, 'Date du document', false, 'Fiche CNIL écoute', null, null, null],
    ['Écoute téléphonique — probatoire', 'Communication', 60, 'Date du document', true, 'Art. 2224 code civil', null, null, null],
    ['Dossier médical EHPAD', 'Santé — Dossiers patients', 240, 'Date du document', true, 'Art. R.1112-7 CSP', null, null, null],
    ['Dossier transfusionnel', 'Santé — Dossiers patients', 360, 'Date du document', true, 'Art. R.1112-7 CSP', null, null, null],
    ['Dossier pharmaceutique — dispensation', 'Santé — Dossiers patients', 32, 'Date du document', true, 'Art. R.111-20-12 CSP', 'duree_variable', null, '[{"label":"Dispensation médicaments (4 mois)","mois":4},{"label":"Vaccins (21 ans)","mois":252},{"label":"Médicament biologique (3 ans)","mois":36}]'],
    ['Dossier pharmaceutique — refus', 'Santé — Dossiers patients', 36, 'Date du document', true, 'Art. R.1111-20-3-1 CSP', null, null, null],
    ['Dossier médical cabinet libéral', 'Santé — Dossiers patients', 120, 'Date du document', true, 'Art. L.1142-28 CSP', null, null, null],
    ['Clichés d\'imagerie', 'Santé — Dossiers patients', 240, 'Date du document', true, 'Art. R.1112-7 CSP', null, null, null],
    ['Dossier administratif patient — identification', 'Santé — Dossiers patients', 60, 'Date du document', true, 'Circulaire AD 94-2', null, null, null],
    ['Dossier administratif patient — facturation', 'Santé — Dossiers patients', 60, 'Date du document', true, 'Circulaire AD 94-2', null, null, null],
    ['Registre d\'entrée et sortie des patients', 'Santé — Dossiers patients', null, 'Date du document', true, 'Arrêté du 11 mars 1968', 'duree_variable', null, '[{"label":"Selon règlement interne","mois":null}]'],
    ['Registre de répertoire des décès', 'Santé — Dossiers patients', 1200, 'Date du document', true, 'Art. n°197', null, null, null],
    ['Registre et suivi des corps décédés', 'Santé — Dossiers patients', 600, 'Date du document', true, 'Arrêté du 5 janvier 2007', null, null, null],
    ['Autorisation autopsie / prélèvement organe', 'Santé — Dossiers patients', 60, 'Date du document', true, 'Art. 1233-1 CSP', null, null, null],
    ['Documents spécifiques malades sous tutelle', 'Santé — Dossiers patients', null, 'Date du document', true, 'Circulaire AD 94-2', 'duree_variable', null, '[{"label":"Selon règlement interne","mois":null}]'],
    ['Laboratoires — dossier patient', 'Santé — Dossiers patients', 180, 'Date du document', false, 'Art. R.1131-20 CSP', null, null, null],
    ['Laboratoires — analyses génétiques', 'Santé — Dossiers patients', 360, 'Date du document', false, 'Art. R.1131-20 CSP', null, null, null],
  ]
  store.categories_cnil = cats.map(([categorie, section, duree_archivage_mois, type_date_reference, obligatoire, fondement_juridique, type_precision, delai_apres_evenement_mois, options_duree]) => {
    let theme_defaut = SECTION_THEME_MAP[section] || 'Autre'
    if (COMPTA_CATS.includes(categorie)) theme_defaut = 'Comptabilité'
    return {
      id: uuid(), categorie, section, duree_archivage_mois, type_date_reference, obligatoire, fondement_juridique,
      type_precision: type_precision || null,
      delai_apres_evenement_mois: delai_apres_evenement_mois ?? null,
      options_duree: options_duree ? JSON.parse(options_duree) : null,
      theme_defaut,
      details: null, duree_base_active: null, duree_archivage_intermediaire: null, source: null, date_maj: now().slice(0, 10),
      actif: true, deleted_at: null,
    }
  })
}

seedCategories()

function ilike(str, pattern) {
  if (!str || !pattern) return false
  return new RegExp(pattern.replace(/%/g, '.*'), 'i').test(str)
}

function buildDocView(d) {
  const carton = store.cartons.find(c => c.id === d.carton_id) || {}
  const salle = store.salles.find(s => s.id === carton.salle_id) || {}
  const etagere = store.etageres.find(e => e.id === carton.etagere_id) || {}
  const cat = store.categories_cnil.find(c => c.id === d.categorie_cnil_id) || {}
  return {
    ...d,
    carton_numero: carton.numero, salle_id: carton.salle_id, etagere_id: carton.etagere_id,
    emplacement: carton.emplacement, salle_nom: salle.nom, etagere_nom: etagere.nom,
    categorie: cat.categorie, categorie_section: cat.section,
    duree_archivage_mois: cat.duree_archivage_mois, type_date_reference: cat.type_date_reference,
    type_precision: cat.type_precision, delai_apres_evenement_mois: cat.delai_apres_evenement_mois,
    options_duree: cat.options_duree,
  }
}

function handleQuery(text, values) {
  const t = text.trim()

  if (t === 'SELECT 1') return { rows: [{ '?column?': 1 }] }

  if (t.startsWith('SELECT generate_numero_carton')) {
    const prefix = values[0]
    store.compteurs[prefix] = (store.compteurs[prefix] || 0) + 1
    return { rows: [{ numero: prefix + '-' + String(store.compteurs[prefix]).padStart(3, '0') }] }
  }

  // AUTH
  if (t.includes('FROM users WHERE email = $1 AND actif = true AND deleted_at IS NULL')) {
    return { rows: store.users.filter(u => u.email === values[0] && u.actif && !u.deleted_at) }
  }
  if (t.includes('FROM users WHERE email = $1 AND actif = true')) {
    return { rows: store.users.filter(u => u.email === values[0] && u.actif && !u.deleted_at) }
  }
  if (t.includes('FROM users WHERE id = $1') && !t.includes('JOIN')) {
    return { rows: store.users.filter(u => u.id === values[0]).map(({ password_hash, ...u }) => u) }
  }

  // ADMIN USERS
  if (t.includes('FROM users WHERE deleted_at IS NULL ORDER')) {
    return { rows: store.users.filter(u => !u.deleted_at).map(({ password_hash, ...u }) => u).sort((a, b) => (a.nom || '').localeCompare(b.nom || '')) }
  }

  if (t.startsWith('INSERT INTO users')) {
    const existing = store.users.find(u => u.email === values[0])
    if (existing) { const e = new Error('Email déjà utilisé'); e.code = '23505'; throw e }
    const user = { id: uuid(), email: values[0], password_hash: values[1], nom: values[2], prenom: values[3], role: values[4], actif: true, deleted_at: null, created_at: now() }
    store.users.push(user)
    const { password_hash, ...safe } = user
    return { rows: [safe] }
  }

  if (t.startsWith('UPDATE users SET actif = false, deleted_at = NOW()')) {
    const user = store.users.find(u => u.id === values[0])
    if (user) { user.actif = false; user.deleted_at = now() }
    return { rows: [] }
  }

  if (t.startsWith('UPDATE users SET')) {
    const id = values[values.length - 1]
    const user = store.users.find(u => u.id === id)
    if (user) {
      t.match(/SET (.+) WHERE/)[1].split(',').map(s => s.trim()).forEach((part, i) => {
        const key = part.split('=')[0].trim()
        user[key] = values[i]
      })
    }
    return { rows: [] }
  }

  // SALLES
  if (t.includes('FROM salles WHERE actif = true AND deleted_at IS NULL')) {
    return { rows: store.salles.filter(s => s.actif && !s.deleted_at).sort((a, b) => a.nom.localeCompare(b.nom)) }
  }
  if (t.includes('FROM salles WHERE deleted_at IS NOT NULL')) {
    return { rows: store.salles.filter(s => s.deleted_at).sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || '')) }
  }
  if (t.startsWith('INSERT INTO salles')) {
    const salle = { id: uuid(), nom: values[0], actif: true, deleted_at: null }
    store.salles.push(salle)
    return { rows: [salle] }
  }
  if (t.startsWith('UPDATE salles SET actif = false, deleted_at')) {
    const s = store.salles.find(x => x.id === values[0])
    if (s) { s.actif = false; s.deleted_at = now() }
    return { rows: [] }
  }
  if (t.startsWith('UPDATE salles SET')) {
    const id = values[values.length - 1]
    const s = store.salles.find(x => x.id === id)
    if (s) {
      t.match(/SET (.+) WHERE/)[1].split(',').map(x => x.trim()).forEach((part, i) => {
        s[part.split('=')[0].trim()] = values[i]
      })
    }
    return { rows: [] }
  }
  if (t.includes('DELETE FROM salles WHERE deleted_at')) return { rows: [] }

  // ETAGERES
  if (t.includes('FROM etageres WHERE salle_id = $1 AND deleted_at IS NULL')) {
    return { rows: store.etageres.filter(e => e.salle_id === values[0] && !e.deleted_at).sort((a, b) => a.nom.localeCompare(b.nom)) }
  }
  if (t.includes('FROM etageres') && t.includes('deleted_at IS NOT NULL')) {
    return { rows: store.etageres.filter(e => e.deleted_at).map(e => ({ ...e, salle_nom: (store.salles.find(s => s.id === e.salle_id) || {}).nom })) }
  }
  if (t.startsWith('INSERT INTO etageres')) {
    const eta = { id: uuid(), salle_id: values[0], nom: values[1], description: values[2], nombre_rangees: values[3] ?? 5, actif: true, deleted_at: null }
    store.etageres.push(eta)
    return { rows: [eta] }
  }
  if (t.startsWith('UPDATE etageres SET actif = false, deleted_at')) {
    const e = store.etageres.find(x => x.id === values[0])
    if (e) { e.actif = false; e.deleted_at = now() }
    return { rows: [] }
  }
  if (t.startsWith('UPDATE etageres SET')) {
    const id = values[values.length - 1]
    const e = store.etageres.find(x => x.id === id)
    if (e) {
      t.match(/SET (.+) WHERE/)[1].split(',').map(x => x.trim()).forEach((part, i) => {
        e[part.split('=')[0].trim()] = values[i]
      })
    }
    return { rows: [] }
  }
  if (t.includes('DELETE FROM etageres WHERE deleted_at')) return { rows: [] }
  if (t.includes('DELETE FROM users WHERE deleted_at')) return { rows: [] }

  // RESTAURATION
  if (t.includes('SET actif = true, deleted_at = NULL WHERE id')) {
    const id = values[0]
    for (const table of [store.salles, store.etageres, store.users, store.categories_cnil]) {
      const item = table.find(x => x.id === id)
      if (item) { item.actif = true; item.deleted_at = null; break }
    }
    return { rows: [] }
  }

  // CATEGORIES CNIL
  if (t.includes('FROM categories_cnil WHERE id = $1')) {
    return { rows: store.categories_cnil.filter(c => c.id === values[0]) }
  }
  if (t.startsWith('INSERT INTO categories_cnil')) {
    const cat = {
      id: uuid(), categorie: values[0], section: values[1], duree_archivage_mois: values[2],
      type_date_reference: values[3], obligatoire: values[4], fondement_juridique: values[5],
      theme_defaut: values[6], type_precision: values[7] || null,
      delai_apres_evenement_mois: values[8] ?? null, options_duree: values[9] || null,
      details: null, duree_base_active: null, duree_archivage_intermediaire: null,
      source: null, date_maj: now().slice(0, 10), actif: true, deleted_at: null,
    }
    store.categories_cnil.push(cat)
    return { rows: [cat] }
  }
  if (t.startsWith('UPDATE categories_cnil SET') && t.includes('deleted_at')) {
    const cat = store.categories_cnil.find(c => c.id === values[0])
    if (cat) { cat.actif = false; cat.deleted_at = now() }
    return { rows: [] }
  }
  if (t.startsWith('UPDATE categories_cnil SET')) {
    const id = values[values.length - 1]
    const cat = store.categories_cnil.find(c => c.id === id)
    if (cat) {
      t.match(/SET (.+) WHERE/)[1].split(',').map(x => x.trim()).forEach((part, i) => {
        cat[part.split('=')[0].trim()] = values[i]
      })
    }
    return { rows: [] }
  }
  if (t.includes('FROM categories_cnil') && t.includes('actif = true')) {
    return { rows: store.categories_cnil.filter(c => c.actif !== false).sort((a, b) => a.section.localeCompare(b.section) || a.categorie.localeCompare(b.categorie)) }
  }
  if (t.includes('FROM categories_cnil')) {
    return { rows: [...store.categories_cnil].sort((a, b) => a.section.localeCompare(b.section) || a.categorie.localeCompare(b.categorie)) }
  }

  // CARTONS
  if (t.startsWith('INSERT INTO cartons')) {
    const carton = { id: uuid(), numero: values[0], salle_id: values[1], etagere_id: values[2], emplacement: values[3], created_by: values[4], created_at: now() }
    store.cartons.push(carton)
    return { rows: [carton] }
  }

  // DERNIER DOCUMENT D'UN CARTON (LOT V)
  if (t.includes('FROM documents WHERE carton_id = $1') && t.includes('ORDER BY created_at DESC') && t.includes('LIMIT 1')) {
    const docs = store.documents.filter(d => d.carton_id === values[0] && !d.detruit)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return { rows: docs.length > 0 ? [docs[0]] : [] }
  }

  // DOCUMENTS
  if (t.startsWith('INSERT INTO documents')) {
    const doc = {
      id: uuid(), carton_id: values[0], theme: values[1], categorie_cnil_id: values[2],
      description: values[3], annee_document: values[4], type_date: values[5],
      date_reference: values[6], date_limite_conservation: values[7],
      obligatoire: values[8], fondement_juridique: values[9],
      date_precise: values[10] || null, date_evenement: values[11] || null,
      duree_mois_saisie: values[12] || null, procedure_close: values[13] ?? null,
      a_completer: values[14] || false, created_by: values[15],
      session_id: values[16] || null,
      detruit: false, created_at: now(), updated_at: now(),
    }
    store.documents.push(doc)
    return { rows: [doc] }
  }

  if (t.startsWith('UPDATE documents SET detruit = true')) {
    const doc = store.documents.find(d => d.id === values[0])
    if (doc) doc.detruit = true
    return { rows: [] }
  }

  if (t.includes('UPDATE documents SET theme=$1')) {
    const id = values[14]
    const doc = store.documents.find(d => d.id === id)
    if (doc) {
      doc.theme = values[0]; doc.categorie_cnil_id = values[1]; doc.description = values[2]
      doc.annee_document = values[3]; doc.date_precise = values[4]; doc.date_evenement = values[5]
      doc.duree_mois_saisie = values[6]; doc.procedure_close = values[7]
      doc.type_date = values[8]; doc.date_reference = values[9]; doc.date_limite_conservation = values[10]
      doc.obligatoire = values[11]; doc.fondement_juridique = values[12]; doc.a_completer = values[13]
      doc.updated_at = now()
    }
    return { rows: [] }
  }

  if (t.includes('UPDATE documents SET carton_id')) {
    const doc = store.documents.find(d => d.id === values[1])
    if (doc) doc.carton_id = values[0]
    return { rows: [] }
  }

  if (t.includes('UPDATE documents SET date_evenement')) {
    const id = values[6]
    const doc = store.documents.find(d => d.id === id)
    if (doc) {
      doc.date_evenement = values[0]; doc.duree_mois_saisie = values[1]
      doc.procedure_close = values[2]; doc.date_precise = values[3]
      doc.date_limite_conservation = values[4]; doc.a_completer = values[5]
    }
    return { rows: [] }
  }

  if (t.startsWith('UPDATE cartons SET')) {
    const id = values[values.length - 1]
    const c = store.cartons.find(x => x.id === id)
    if (c) {
      t.match(/SET (.+) WHERE/)[1].split(',').map(x => x.trim()).forEach((part, i) => {
        c[part.split('=')[0].trim()] = values[i]
      })
    }
    return { rows: [] }
  }

  if (t.includes('FROM documents WHERE id = $1') && !t.includes('JOIN')) {
    return { rows: store.documents.filter(d => d.id === values[0]) }
  }

  if (t.includes('FROM documents d JOIN categories_cnil c ON')) {
    const doc = store.documents.find(d => d.id === values[0])
    if (!doc) return { rows: [] }
    return { rows: store.categories_cnil.filter(c => c.id === doc.categorie_cnil_id) }
  }

  // DOCUMENTS VIEW
  if (t.includes('v_documents_complets')) {
    let results = store.documents.map(buildDocView)

    if (t.includes('detruit = false')) {
      results = results.filter(r => !r.detruit)
    }

    if (t.includes('a_completer = true')) {
      results = results.filter(r => r.a_completer)
    } else if (t.includes('a_completer = false')) {
      results = results.filter(r => !r.a_completer)
    }

    let paramIdx = 0
    if (t.includes('salle_id = $')) { results = results.filter(r => r.salle_id === values[paramIdx]); paramIdx++ }
    if (t.includes('theme = $')) { results = results.filter(r => r.theme === values[paramIdx]); paramIdx++ }
    if (t.includes('annee_document = $')) { results = results.filter(r => r.annee_document === values[paramIdx]); paramIdx++ }
    if (t.includes('etagere_id = $')) { results = results.filter(r => r.etagere_id === values[paramIdx]); paramIdx++ }
    if (t.includes('carton_numero ILIKE')) { results = results.filter(r => ilike(r.carton_numero, values[paramIdx])); paramIdx++ }
    if (t.includes('description ILIKE')) {
      const s = values[paramIdx]
      results = results.filter(r => ilike(r.description, s) || ilike(r.categorie, s) || ilike(r.carton_numero, s))
    }

    results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return { rows: results }
  }

  // DOCUMENTS DETRUITS VIEW (LOT S)
  if (t.includes('v_documents_complets') && t.includes('destructions') && t.includes('detruit = true')) {
    const destroyed = store.documents.filter(d => d.detruit)
    const results = destroyed.map(d => {
      const view = buildDocView(d)
      const dest = store.destructions.find(x => x.document_id === d.id) || {}
      const u = store.users.find(x => x.id === dest.effectue_par) || {}
      return {
        ...view,
        date_destruction: dest.date_destruction, methode: dest.methode, dest_notes: dest.notes,
        destructeur_nom: u.nom, destructeur_prenom: u.prenom,
      }
    }).sort((a, b) => (b.date_destruction || '').localeCompare(a.date_destruction || ''))
    return { rows: results }
  }

  // DESTRUCTIONS
  if (t.startsWith('INSERT INTO destructions')) {
    const dest = { id: uuid(), document_id: values[0], date_destruction: values[1], effectue_par: values[2], methode: values[3], notes: values[4], created_at: now() }
    store.destructions.push(dest)
    return { rows: [dest] }
  }

  // AUDIT
  if (t.startsWith('INSERT INTO audit_log')) {
    store.audit_log.push({ id: uuid(), user_id: values[0], action: values[1], table_concernee: values[2], enregistrement_id: values[3], details: values[4], created_at: now() })
    return { rows: [] }
  }
  if (t.includes('FROM audit_log')) {
    const logs = store.audit_log.map(a => {
      const u = store.users.find(x => x.id === a.user_id) || {}
      return { ...a, nom: u.nom, prenom: u.prenom, email: u.email }
    }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return { rows: logs.slice(0, 200) }
  }

  // REFRESH TOKENS
  if (t.startsWith('INSERT INTO refresh_tokens')) {
    store.refresh_tokens.push({ id: uuid(), user_id: values[0], token_hash: values[1], expires_at: values[2], session_id: values[3] || null, revoked: false, created_at: now() })
    return { rows: [] }
  }
  if (t.includes('FROM refresh_tokens rt JOIN users u')) {
    const rt = store.refresh_tokens.find(r => r.token_hash === values[0] && !r.revoked && new Date(r.expires_at) > new Date())
    if (!rt) return { rows: [] }
    const u = store.users.find(x => x.id === rt.user_id)
    if (!u) return { rows: [] }
    return { rows: [{ ...rt, uid: u.id, role: u.role, actif: u.actif, deleted_at: u.deleted_at, session_id: rt.session_id }] }
  }
  if (t.includes('UPDATE refresh_tokens SET revoked')) {
    const rt = store.refresh_tokens.find(r => r.token_hash === values[0])
    if (rt) rt.revoked = true
    return { rows: [] }
  }

  // SUPPRIMÉS RÉCEMMENT - users
  if (t.includes('FROM users WHERE deleted_at IS NOT NULL')) {
    return { rows: store.users.filter(u => u.deleted_at).map(({ password_hash, ...u }) => u) }
  }

  // BEGIN/COMMIT/ROLLBACK
  if (t === 'BEGIN' || t === 'COMMIT' || t === 'ROLLBACK') return { rows: [] }

  console.warn('[MEMDB] Requête non gérée:', t.slice(0, 80))
  return { rows: [] }
}

const memoryPool = {
  _isMemory: true,
  query: async (text, values = []) => handleQuery(text, values),
  connect: async () => ({
    query: async (text, values = []) => handleQuery(text, values),
    release: () => {},
  }),
}

module.exports = memoryPool
