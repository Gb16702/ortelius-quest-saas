import { z } from 'zod'

export const postmarkInboundSchema = z.object({
  From: z.string(),
  FromName: z.string(),
  FromFull: z.object({
    Email: z.string(),
    Name: z.string(),
    MailboxHash: z.string(),
  }),
  To: z.string(),
  ToFull: z.array(
    z.object({
      Email: z.string(),
      Name: z.string(),
      MailboxHash: z.string(),
    })
  ),
  Subject: z.string(),
  TextBody: z.string(),
  HtmlBody: z.string().optional(),
  MessageID: z.string(),
  MessageStream: z.string().optional(),
  Date: z.string(),
  OriginalRecipient: z.string().optional(),
  ReplyTo: z.string().optional(),
  MailboxHash: z.string().optional(),
  Tag: z.string().optional(),
  Headers: z
    .array(
      z.object({
        Name: z.string(),
        Value: z.string(),
      })
    )
    .optional(),
  Attachments: z
    .array(
      z.object({
        Name: z.string(),
        Content: z.string(),
        ContentType: z.string(),
        ContentLength: z.number(),
      })
    )
    .optional(),
})

export type PostmarkInboundInput = z.infer<typeof postmarkInboundSchema>
