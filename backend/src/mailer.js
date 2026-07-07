const nodemailer = require('nodemailer')

let transporter = null

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  console.log('[MAILER] SMTP configuré :', process.env.SMTP_HOST)
} else {
  console.log('[MAILER] SMTP non configuré — les invitations seront créées sans envoi d\'email')
}

function smtpReady() {
  return !!transporter
}

async function sendInvitation(email, token, inviterName) {
  if (!transporter) return false
  const url = `${process.env.APP_URL || 'http://localhost:8080'}/invitation?token=${token}`
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Invitation — Archives Lépine Versailles',
    html: `
      <p>Bonjour,</p>
      <p>${inviterName} vous invite à rejoindre l'application <strong>Archives Lépine Versailles</strong>.</p>
      <p><a href="${url}">Cliquez ici pour créer votre compte</a></p>
      <p>Ce lien est valable 72 heures.</p>
      <p>Si vous n'êtes pas concerné(e), ignorez cet email.</p>
    `,
  })
  return true
}

module.exports = { smtpReady, sendInvitation }
