import { z } from 'zod'

export const contactSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  country: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  companySize: z.string().optional(),
  message: z.string().min(1),
})
