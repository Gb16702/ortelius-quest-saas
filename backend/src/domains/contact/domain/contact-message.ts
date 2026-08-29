export interface ContactMessageInput {
  email: string
  fullName: string
  country: string
  website?: string
  companySize?: string
  message: string
}

export interface ContactEmailContent {
  to: string
  replyTo: string
  subject: string
  htmlBody: string
  textBody: string
}

export function buildContactEmail(
  data: ContactMessageInput,
  recipient: string
): ContactEmailContent {
  const { email, fullName, country, website, companySize, message } = data

  const htmlBody = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${fullName} (${email})</p>
      <p><strong>Country:</strong> ${country}</p>
      ${website ? `<p><strong>Website:</strong> ${website}</p>` : ''}
      ${companySize ? `<p><strong>Company Size:</strong> ${companySize}</p>` : ''}
      <hr />
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br />')}</p>
    `

  const textBody = `
New Contact Form Submission

From: ${fullName} (${email})
Country: ${country}
${website ? `Website: ${website}\n` : ''}${companySize ? `Company Size: ${companySize}\n` : ''}
---
Message:
${message}
    `.trim()

  return {
    to: recipient,
    replyTo: email,
    subject: `[Ortelius Quest] Contact from ${fullName}`,
    htmlBody,
    textBody,
  }
}

export function contactRecipientForEnvironment(nodeEnv: string | undefined): string {
  return nodeEnv === 'production' ? 'info@ortelius.app' : 'delgeoffrey1@gmail.com'
}
