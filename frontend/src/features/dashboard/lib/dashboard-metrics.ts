export interface TrendData {
    value: number
    isPositive: boolean
}

export function calculateTrend(currentValue: number, previousValue: number): TrendData | null {
    if (previousValue === 0) {
        return null
    }

    const percentChange = ((currentValue - previousValue) / previousValue) * 100

    if (percentChange === 0) return null

    return {
        value: percentChange,
        isPositive: percentChange >= 0,
    }
}

export function sumDailyMetrics<T>(metrics: T[], key: keyof T): number {
    return metrics.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}
