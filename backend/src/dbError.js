// Mappe les erreurs de contrainte PostgreSQL dues à une entrée invalide vers un 400 explicite,
// pour qu'aucune donnée utilisateur mal formée ne remonte en 500.
//   23503 = violation de clé étrangère (référence introuvable)
//   23502 = violation NOT NULL
//   22P02 = format invalide (ex. UUID ou entier mal formé)
//   22003 = valeur numérique hors limites
// Renvoie true si l'erreur a été traitée (réponse 400 envoyée), false sinon (au caller de faire le 500).
const CONSTRAINT_CODES = ['23503', '23502', '22P02', '22003']

function handleDbConstraintError(err, res) {
  if (err && CONSTRAINT_CODES.includes(err.code)) {
    res.status(400).json({ error: 'Donnée invalide ou référence introuvable' })
    return true
  }
  return false
}

module.exports = { handleDbConstraintError }
