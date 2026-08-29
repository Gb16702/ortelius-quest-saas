import type {
  PriceSuggestion,
  ServiceReference,
  SuggestPricingRequest,
  TieredStats,
  TierName,
} from './pricing-intelligence-models'

export const MIN_TRANSACTIONS_THRESHOLD = 10
export const MIN_TIER_SAMPLE_SIZE = 5
export const BAYESIAN_PRIOR_WEIGHT = 20
export const MIN_CORRELATION = 0.3
export const DECAY_HALF_LIFE_DAYS = 180

export function selectBestTier(tiers: TieredStats[]): TieredStats | null {
  const priority: TierName[] = ['exact', 'flags', 'partial']
  for (const name of priority) {
    const tier = tiers.find((t) => t.tier === name && t.count >= MIN_TIER_SAMPLE_SIZE)
    if (tier) return tier
  }
  return null
}

export function blendedAverage(
  contextualAvg: number,
  globalAvg: number,
  contextualCount: number
): number {
  const credibility = contextualCount / (contextualCount + BAYESIAN_PRIOR_WEIGHT)
  return credibility * contextualAvg + (1 - credibility) * globalAvg
}

export function computeRegressionAdjustment(
  tier: TieredStats,
  cargoWeight: number | null,
  cargoVolume: number | null
): number {
  let adjustment = 0
  let factors = 0

  if (
    cargoWeight !== null &&
    tier.weightSlope !== null &&
    tier.weightIntercept !== null &&
    tier.weightCorr !== null &&
    Math.abs(tier.weightCorr) >= MIN_CORRELATION
  ) {
    const predicted = tier.weightIntercept + tier.weightSlope * cargoWeight
    const deviation = predicted - tier.avg
    const rSquared = tier.weightCorr * tier.weightCorr
    adjustment += deviation * rSquared
    factors++
  }

  if (
    cargoVolume !== null &&
    tier.volumeSlope !== null &&
    tier.volumeIntercept !== null &&
    tier.volumeCorr !== null &&
    Math.abs(tier.volumeCorr) >= MIN_CORRELATION
  ) {
    const predicted = tier.volumeIntercept + tier.volumeSlope * cargoVolume
    const deviation = predicted - tier.avg
    const rSquared = tier.volumeCorr * tier.volumeCorr
    adjustment += deviation * rSquared
    factors++
  }

  return factors === 2 ? adjustment / 2 : adjustment
}

export function computeSuggestedPrice(
  tier: TieredStats,
  globalTier: TieredStats,
  cargoWeight: number | null,
  cargoVolume: number | null
): number {
  const base = blendedAverage(tier.avg, globalTier.avg, tier.count)
  const regression = computeRegressionAdjustment(tier, cargoWeight, cargoVolume)
  const raw = base + regression
  return Math.round(Math.max(globalTier.min, Math.min(globalTier.max, raw)))
}

export function computeConfidence(tier: TieredStats): 'high' | 'medium' | 'low' {
  const sampleScore = 1 / (1 + Math.exp(-0.15 * (tier.count - 30)))
  const cv = tier.avg > 0 ? tier.stddev / tier.avg : 1
  const consistencyScore = Math.max(0, Math.min(1, 1 - cv))
  const tierWeights: Record<TierName, number> = {
    exact: 1.0,
    flags: 0.7,
    partial: 0.4,
    global: 0.2,
  }
  const tierScore = tierWeights[tier.tier]

  const composite = 0.45 * sampleScore + 0.35 * consistencyScore + 0.2 * tierScore

  if (composite >= 0.65) return 'high'
  if (composite >= 0.4) return 'medium'
  return 'low'
}

export function generateReasoning(
  serviceName: string,
  tier: TieredStats,
  globalTier: TieredStats,
  context: SuggestPricingRequest
): string {
  const parts: string[] = []

  const tierLabels: Record<TierName, string> = {
    exact: 'transactions matching cargo type and special handling flags',
    flags: 'transactions matching special handling requirements',
    partial: 'transactions with similar cargo characteristics',
    global: 'all historical transactions',
  }
  parts.push(
    `Based on ${tier.count} ${tierLabels[tier.tier]} for ${serviceName} (price range: $${globalTier.min.toFixed(0)}-$${globalTier.max.toFixed(0)}).`
  )

  if (tier.tier !== 'global') {
    const credibility = tier.count / (tier.count + BAYESIAN_PRIOR_WEIGHT)
    parts.push(
      `Price blended ${Math.round(credibility * 100)}% from contextual average ($${tier.avg.toFixed(0)}) and ${Math.round((1 - credibility) * 100)}% from global average ($${globalTier.avg.toFixed(0)}).`
    )
  }

  const specialFlags: string[] = []
  if (context.cargoIsHazardous) specialFlags.push('hazardous materials')
  if (context.cargoIsReefer) specialFlags.push('refrigerated cargo')
  if (context.cargoIsOversized) specialFlags.push('oversized cargo')
  if (specialFlags.length > 0) {
    parts.push(`Accounts for ${specialFlags.join(', ')}.`)
  }

  if (
    context.cargoWeight !== null &&
    tier.weightCorr !== null &&
    Math.abs(tier.weightCorr) >= MIN_CORRELATION
  ) {
    parts.push(`Weight-adjusted for ${context.cargoWeight.toLocaleString()}kg cargo.`)
  }
  if (
    context.cargoVolume !== null &&
    tier.volumeCorr !== null &&
    Math.abs(tier.volumeCorr) >= MIN_CORRELATION
  ) {
    parts.push(`Volume-adjusted for ${context.cargoVolume.toLocaleString()}m3 cargo.`)
  }

  return parts.join(' ')
}

export function buildPriceSuggestions(input: {
  context: SuggestPricingRequest
  serviceReferences: ServiceReference[]
  serviceTiers: Array<{ serviceId: string; tiers: TieredStats[] }>
}): PriceSuggestion[] {
  const serviceMap = new Map(input.serviceReferences.map((s) => [s.id, s.name]))
  const suggestions: PriceSuggestion[] = []

  for (const { serviceId, tiers } of input.serviceTiers) {
    const globalTier = tiers.find((t) => t.tier === 'global')
    if (!globalTier || globalTier.count < MIN_TRANSACTIONS_THRESHOLD) continue

    const bestTier = selectBestTier(tiers) ?? globalTier
    const suggestedPrice = computeSuggestedPrice(
      bestTier,
      globalTier,
      input.context.cargoWeight,
      input.context.cargoVolume
    )
    const confidence = computeConfidence(bestTier)
    const serviceName = serviceMap.get(serviceId) ?? serviceId

    suggestions.push({
      serviceId,
      serviceName,
      suggestedPrice,
      confidence,
      reasoning: generateReasoning(serviceName, bestTier, globalTier, input.context),
      stats: {
        transactionCount: globalTier.count,
        avgPrice: Math.round(globalTier.avg * 100) / 100,
        minPrice: Math.round(globalTier.min * 100) / 100,
        maxPrice: Math.round(globalTier.max * 100) / 100,
      },
    })
  }

  return suggestions
}
