import { nanoid } from 'nanoid'
import { EmailService } from '../../../../emails/services/email.service'
import { EmailTemplate, type TemplateProps } from '../../../../emails/types'
import type { EblastJob, EblastRequest } from '../application/eblast-models'
import type { EblastProcessorPort } from '../application/ports'
import {
  chunkEblastRecipients,
  EBLAST_DELAY_BETWEEN_BATCHES_MS,
  EBLAST_DELAY_BETWEEN_EMAILS_MS,
  isEblastJobExpired,
  templateDisplayName,
} from '../domain'

export class InMemoryEblastProcessor implements EblastProcessorPort {
  private jobs: Map<string, EblastJob> = new Map()

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private cleanupOldJobs(): void {
    for (const [id, job] of this.jobs.entries()) {
      if (isEblastJobExpired(job.createdAt)) {
        this.jobs.delete(id)
      }
    }
  }

  startEblast(request: EblastRequest): EblastJob {
    this.cleanupOldJobs()

    const job: EblastJob = {
      id: nanoid(12),
      status: 'pending',
      totalEmails: request.emails.length,
      processed: 0,
      sent: 0,
      failed: 0,
      results: [],
      createdAt: new Date(),
    }

    this.jobs.set(job.id, job)
    this.processEblast(job, request)

    return job
  }

  private async processEblast(job: EblastJob, request: EblastRequest): Promise<void> {
    job.status = 'processing'

    const batches = chunkEblastRecipients(request.emails)

    try {
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        for (const email of batch) {
          try {
            const result = await EmailService.sendTemplatedEmail(
              request.template as EmailTemplate,
              request.templateProps as TemplateProps<EmailTemplate>,
              {
                to: email,
                subject: request.subject,
                from: request.from,
              }
            )

            job.processed++

            if (result.success) {
              job.sent++
              job.results.push({
                email,
                success: true,
                messageId: result.messageId,
              })
            } else {
              job.failed++
              job.results.push({
                email,
                success: false,
                error: typeof result.error === 'string' ? result.error : 'Failed to send email',
              })
            }
          } catch (error) {
            job.processed++
            job.failed++
            job.results.push({
              email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }

          await this.delay(EBLAST_DELAY_BETWEEN_EMAILS_MS)
        }

        if (batchIndex < batches.length - 1) {
          await this.delay(EBLAST_DELAY_BETWEEN_BATCHES_MS)
        }
      }

      job.status = 'completed'
      job.completedAt = new Date()
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.completedAt = new Date()
    }
  }

  getJob(jobId: string): EblastJob | undefined {
    return this.jobs.get(jobId)
  }

  listJobs(): EblastJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  getAvailableTemplates(): { name: string; value: string }[] {
    return Object.entries(EmailTemplate).map(([key, value]) => ({
      name: templateDisplayName(key),
      value,
    }))
  }
}

export const eblastProcessor = new InMemoryEblastProcessor()
