import { beforeEach, describe, expect, it } from 'bun:test'
import type { RequestPdfData } from '../application/document-models'
import { PdfKitGeneratorAdapter } from '../infrastructure/pdf-generator.adapter'

describe('PdfService', () => {
  let pdfService: PdfKitGeneratorAdapter

  beforeEach(() => {
    pdfService = new PdfKitGeneratorAdapter()
  })

  const mockRequestData: RequestPdfData = {
    id: 'req-123',
    reqNumber: 'REQ-2024-001',
    requesterName: 'John Doe',
    requesterEmail: 'john@example.com',
    receiverOrganizationId: 'Test Organization',
    categories: ['Transport', 'Logistics'],
    services: ['Freight', 'Delivery'],
    cargoDetails: {
      weight: 1000,
      volume: 5,
      dimensions: {
        length: 200,
        width: 100,
        height: 50,
      },
      palletCount: 2,
      fragility: 'Medium',
    },
    comments: 'Special handling required',
    fromDate: new Date('2024-01-15'),
    toDate: new Date('2024-01-30'),
    lifecycleStatus: 'open',
  }

  describe('generateRequestPdf', () => {
    it('should generate a PDF buffer with valid request data', async () => {
      const pdfBuffer = await pdfService.generateRequestPdf(mockRequestData)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)

      const pdfHeader = pdfBuffer.slice(0, 4).toString()
      expect(pdfHeader).toBe('%PDF')
    })

    it('should generate a PDF with minimal data', async () => {
      const minimalData: RequestPdfData = {
        reqNumber: 'REQ-MIN-001',
      }

      const pdfBuffer = await pdfService.generateRequestPdf(minimalData)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)

      const pdfHeader = pdfBuffer.slice(0, 4).toString()
      expect(pdfHeader).toBe('%PDF')
    })

    it('should generate a PDF without cargo details', async () => {
      const dataWithoutCargo: RequestPdfData = {
        reqNumber: 'REQ-NO-CARGO-001',
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.com',
        categories: ['Transport'],
        services: ['Standard'],
      }

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithoutCargo)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })

    it('should generate a PDF without comments', async () => {
      const dataWithoutComments = { ...mockRequestData }
      delete dataWithoutComments.comments

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithoutComments)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })

    it('should handle empty arrays gracefully', async () => {
      const dataWithEmptyArrays: RequestPdfData = {
        reqNumber: 'REQ-EMPTY-001',
        categories: [],
        services: [],
      }

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithEmptyArrays)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })

    it('should handle invalid dates gracefully', async () => {
      const dataWithInvalidDates: RequestPdfData = {
        reqNumber: 'REQ-INVALID-DATE-001',
        fromDate: new Date('invalid-date'),
        toDate: new Date('another-invalid-date'),
      }

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithInvalidDates)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })
  })

  describe('generateRequestPdfStream', () => {
    it('should generate a readable stream', () => {
      const stream = pdfService.generateRequestPdfStream(mockRequestData)

      expect(stream).toBeDefined()
      expect(typeof stream.on).toBe('function')
      expect(typeof stream.read).toBe('function')
    })

    it('should generate a stream with minimal data', () => {
      const minimalData: RequestPdfData = {
        reqNumber: 'REQ-STREAM-001',
      }

      const stream = pdfService.generateRequestPdfStream(minimalData)

      expect(stream).toBeDefined()
      expect(typeof stream.on).toBe('function')
    })
  })

  describe('edge cases', () => {
    it('should handle partial cargo details', async () => {
      const dataWithPartialCargo: RequestPdfData = {
        reqNumber: 'REQ-PARTIAL-001',
        cargoDetails: {
          weight: 500,
        },
      }

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithPartialCargo)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })

    it('should handle partial dimensions', async () => {
      const dataWithPartialDimensions: RequestPdfData = {
        reqNumber: 'REQ-PARTIAL-DIM-001',
        cargoDetails: {
          dimensions: {
            length: 100,
          },
        },
      }

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithPartialDimensions)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })

    it('should handle very long comments', async () => {
      const longComment =
        'This is a very long comment that should span multiple lines and test the PDF generation with extensive text content. '.repeat(
          20
        )

      const dataWithLongComment: RequestPdfData = {
        reqNumber: 'REQ-LONG-001',
        comments: longComment,
      }

      const pdfBuffer = await pdfService.generateRequestPdf(dataWithLongComment)

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })
  })
})
