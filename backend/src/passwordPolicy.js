const PASSWORD_ERROR = 'Le mot de passe doit contenir au moins 8 caractères, dont un chiffre et un caractère spécial'

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return { ok: false, error: PASSWORD_ERROR }
  if (!/[0-9]/.test(pw)) return { ok: false, error: PASSWORD_ERROR }
  if (!/[^a-zA-Z0-9]/.test(pw)) return { ok: false, error: PASSWORD_ERROR }
  return { ok: true, error: null }
}

module.exports = { validatePassword, PASSWORD_ERROR }
