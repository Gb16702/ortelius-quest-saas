import type { Readable } from 'node:stream'
import PDFDocument from 'pdfkit'
import type { RequestPdfData } from '../application/document-models'
import type { PdfGeneratorPort } from '../application/ports'

const formatDate = (date: Date | string): string => {
  try {
    const d = new Date(date)
    return d.toLocaleDateString('en-US')
  } catch (_error) {
    return 'Not provided'
  }
}

const checkPageBreak = (
  doc: PDFKit.PDFDocument,
  yPosition: number,
  extraSpace = 0,
  marginTop = 20
) => {
  if (yPosition + extraSpace > doc.page.height - doc.page.margins.bottom) {
    doc.addPage()
    return doc.page.margins.top + marginTop
  }
  return yPosition
}

const generatePDFContent = (doc: PDFKit.PDFDocument, requestData: RequestPdfData): void => {
  const labelX = 50
  const valueX = 200
  const rowHeight = 30

  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#333333')
    .text(`Transport Request - ${requestData.reqNumber || 'N/A'}`, 0, 40, { align: 'center' })

  let yPosition = 100

  const basicInfo = [
    { label: 'Request Number', value: requestData.reqNumber || 'Not provided' },
    { label: 'Requester', value: requestData.requesterName || 'Not provided' },
    { label: 'Email', value: requestData.requesterEmail || 'Not provided' },
    { label: 'Organization', value: requestData.receiverOrganizationId || 'Not provided' },
    { label: 'Lifecycle status', value: requestData.lifecycleStatus || 'open' },
    ...(requestData.closedReason
      ? [{ label: 'Closed reason', value: requestData.closedReason }]
      : []),
    {
      label: 'Start Date',
      value: requestData.fromDate ? formatDate(requestData.fromDate) : 'Not provided',
    },
    {
      label: 'End Date',
      value: requestData.toDate ? formatDate(requestData.toDate) : 'Not provided',
    },
  ]

  basicInfo.forEach((info) => {
    yPosition = checkPageBreak(doc, yPosition, rowHeight)

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(`${info.label}:`, labelX, yPosition)

    doc
      .fillColor('#f5f5f5')
      .rect(valueX, yPosition - 3, 250, 18)
      .fill()

    doc
      .fillColor('black')
      .font('Helvetica')
      .text(info.value, valueX + 5, yPosition)

    yPosition += rowHeight
  })

  yPosition += 30
  yPosition = checkPageBreak(doc, yPosition, 60)

  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Requested Services', labelX, yPosition, { underline: true })

  yPosition += 30

  const servicesInfo = [
    {
      label: 'Categories',
      value: requestData.categories?.length ? requestData.categories.join(', ') : 'No categories',
    },
    {
      label: 'Services',
      value: requestData.services?.length ? requestData.services.join(', ') : 'No services',
    },
  ]

  servicesInfo.forEach((info) => {
    yPosition = checkPageBreak(doc, yPosition, rowHeight)

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(`${info.label}:`, labelX, yPosition)

    doc.font('Helvetica').text(info.value, valueX, yPosition, { width: 250 })

    yPosition += rowHeight
  })

  if (requestData.cargoDetails) {
    yPosition += 30
    yPosition = checkPageBreak(doc, yPosition, 60)

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Cargo Details', labelX, yPosition, { underline: true })

    yPosition += 30

    const cargoDetails = requestData.cargoDetails
    const cargoInfo = [
      {
        label: 'Weight',
        value: cargoDetails.weight ? `${cargoDetails.weight} kg` : 'Not provided',
      },
      {
        label: 'Volume',
        value: cargoDetails.volume ? `${cargoDetails.volume} m³` : 'Not provided',
      },
      {
        label: 'Dimensions',
        value:
          cargoDetails.dimensions?.length &&
          cargoDetails.dimensions?.width &&
          cargoDetails.dimensions?.height
            ? `${cargoDetails.dimensions.length}x${cargoDetails.dimensions.width}x${cargoDetails.dimensions.height} cm`
            : 'Not provided',
      },
      {
        label: 'Pallets',
        value: cargoDetails.palletCount ? cargoDetails.palletCount.toString() : 'Not provided',
      },
      { label: 'Fragility', value: cargoDetails.fragility || 'Not provided' },
    ]

    cargoInfo.forEach((info) => {
      yPosition = checkPageBreak(doc, yPosition, rowHeight)

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('black')
        .text(`${info.label}:`, labelX, yPosition)

      doc
        .fillColor('#f5f5f5')
        .rect(valueX, yPosition - 3, 250, 18)
        .fill()

      doc
        .fillColor('black')
        .font('Helvetica')
        .text(info.value, valueX + 5, yPosition)

      yPosition += rowHeight
    })
  }

  if (requestData.comments) {
    yPosition += 30
    yPosition = checkPageBreak(doc, yPosition, 60)

    doc.fontSize(16).font('Helvetica-Bold').text('Comments', labelX, yPosition, { underline: true })

    yPosition += 20

    doc.fontSize(12).font('Helvetica').text(requestData.comments, labelX, yPosition, { width: 500 })
  }

  const footerY = doc.page.height - 50
  doc
    .fontSize(10)
    .fillColor('gray')
    .text('Generated by Ortelius', 0, footerY, { align: 'center', width: doc.page.width })
}

export class PdfKitGeneratorAdapter implements PdfGeneratorPort {
  async generateRequestPdf(requestData: RequestPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 20 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => {
        chunks.push(chunk)
      })

      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer)
      })

      doc.on('error', (err) => {
        reject(err)
      })

      try {
        generatePDFContent(doc, requestData)
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  generateRequestPdfStream(requestData: RequestPdfData): NodeJS.ReadableStream {
    const doc = new PDFDocument({ margin: 20 })

    generatePDFContent(doc, requestData)
    doc.end()

    return doc as unknown as Readable
  }
}
