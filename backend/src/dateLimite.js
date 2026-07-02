function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function calculerDateLimite(doc, categorie) {
  const dateRef = doc.date_precise
    || (doc.annee_document ? `${doc.annee_document}-01-01` : null)

  if (categorie.duree_archivage_mois && !categorie.type_precision) {
    return dateRef ? addMonths(dateRef, categorie.duree_archivage_mois) : null
  }

  switch (categorie.type_precision) {
    case 'fin_habilitation':
    case 'fin_mandat':
      return doc.date_evenement
        ? addMonths(doc.date_evenement, categorie.delai_apres_evenement_mois || 0)
        : null
    case 'fin_procedure':
      return doc.date_evenement ? doc.date_evenement : null
    case 'duree_variable':
      return (doc.duree_mois_saisie && dateRef)
        ? addMonths(dateRef, doc.duree_mois_saisie)
        : null
    default:
      return (dateRef && categorie.duree_archivage_mois)
        ? addMonths(dateRef, categorie.duree_archivage_mois)
        : null
  }
}

module.exports = { calculerDateLimite, addMonths }
