import type {
  HistoricalTransactionInput,
  ImportBatchError,
  ServiceReference,
} from './pricing-intelligence-models'

export function fuzzyMatchService(
  name: string,
  serviceMap: Map<string, string>
): string | undefined {
  const normalized = name.toLowerCase().trim()
  const exact = serviceMap.get(normalized)
  if (exact) return exact

  for (const [key, id] of serviceMap) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return id
    }
  }

  return undefined
}

export function buildCsvTemplateRows(input: {
  services: ServiceReference[]
  categories: Array<{ name: string }>
}): string {
  const headers = [
    'service_name',
    'price',
    'currency',
    'cargo_categories',
    'cargo_weight_kg',
    'cargo_volume_m3',
    'is_hazardous',
    'is_reefer',
    'is_oversized',
    'transaction_date',
  ]

  const firstService = input.services[0]?.name ?? 'Towage'
  const secondService = input.services[1]?.name ?? input.services[0]?.name ?? 'Pilotage'
  const firstCategory = input.categories[0]?.name ?? 'General Cargo'
  const secondCategory = input.categories[1]?.name ?? input.categories[0]?.name ?? 'Bulk Cargo'

  return [
    headers.join(','),
    `${firstService},817,EUR,${firstCategory},5000,200,0,0,0,2024-01-15`,
    `${secondService},1250,EUR,${secondCategory},12000,450,0,1,0,2024-02-20`,
    `${firstService},950,EUR,${firstCategory};${secondCategory},8000,,1,0,0,2024-03-10`,
  ].join('\n')
}

export function parsePricingCsv(input: {
  organizationId: string
  csvContent: string
  batchId: string
  services: ServiceReference[]
  now: Date
  generateId: () => string
}): { errors: ImportBatchError[]; transactions: HistoricalTransactionInput[] } {
  const serviceNameMap = new Map<string, string>()
  for (const service of input.services) {
    serviceNameMap.set(service.name.toLowerCase(), service.id)
  }

  const lines = input.csvContent.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('#')
  })
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row')
  }

  const errors: ImportBatchError[] = []
  const transactions: HistoricalTransactionInput[] = []

  for (let index = 1; index < lines.length; index++) {
    const cols = lines[index].split(',').map((column) => column.trim())
    const rowNum = index + 1

    if (cols.length < 3) {
      errors.push({ row: rowNum, message: 'Too few columns' })
      continue
    }

    const [
      serviceName,
      priceStr,
      currency,
      categoriesStr,
      weightStr,
      volumeStr,
      hazStr,
      reeferStr,
      oversizedStr,
      dateStr,
    ] = cols

    const serviceId = fuzzyMatchService(serviceName, serviceNameMap)
    if (!serviceId) {
      errors.push({ row: rowNum, message: `Unknown service: "${serviceName}"` })
      continue
    }

    const price = Number.parseFloat(priceStr)
    if (Number.isNaN(price) || price < 0) {
      errors.push({ row: rowNum, message: `Invalid price: "${priceStr}"` })
      continue
    }

    const transactionDate = dateStr ? new Date(dateStr) : input.now
    if (Number.isNaN(transactionDate.getTime())) {
      errors.push({ row: rowNum, message: `Invalid date: "${dateStr}"` })
      continue
    }

    const cargoCategories = categoriesStr
      ? categoriesStr
          .split(';')
          .map((category) => category.trim())
          .filter(Boolean)
      : []

    transactions.push({
      id: input.generateId(),
      organizationId: input.organizationId,
      serviceId,
      price,
      currency: currency || 'EUR',
      cargoCategories,
      cargoWeight: weightStr ? Number.parseFloat(weightStr) || null : null,
      cargoVolume: volumeStr ? Number.parseFloat(volumeStr) || null : null,
      cargoIsHazardous: hazStr === '1' ? 1 : 0,
      cargoIsReefer: reeferStr === '1' ? 1 : 0,
      cargoIsOversized: oversizedStr === '1' ? 1 : 0,
      source: 'csv_import',
      importBatchId: input.batchId,
      quoteId: null,
      transactionDate,
      createdAt: input.now,
    })
  }

  return { errors, transactions }
}
