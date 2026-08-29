type TimedOperation<T> = () => T | Promise<T>

export interface GraphQLServerTiming {
  measure<T>(name: string, operation: TimedOperation<T>): Promise<T>
  toHeader(): string
}

type TimingMetric = {
  name: string
  durationMs: number
}

const SERVER_TIMING_NAME_PATTERN = /[^A-Za-z0-9_-]/g

function sanitizeServerTimingName(name: string): string {
  return name.replace(SERVER_TIMING_NAME_PATTERN, '_')
}

export function createGraphQLServerTiming(): GraphQLServerTiming {
  const metrics: TimingMetric[] = []

  return {
    async measure<T>(name: string, operation: TimedOperation<T>): Promise<T> {
      const startedAt = performance.now()
      try {
        return await operation()
      } finally {
        metrics.push({
          name: sanitizeServerTimingName(name),
          durationMs: Math.max(0, performance.now() - startedAt),
        })
      }
    },

    toHeader(): string {
      return metrics
        .map((metric) => `${metric.name};dur=${metric.durationMs.toFixed(1)}`)
        .join(', ')
    },
  }
}

export async function recordGraphQLTiming<T>(
  serverTiming: GraphQLServerTiming | null | undefined,
  name: string,
  operation: TimedOperation<T>
): Promise<T> {
  if (!serverTiming) {
    return await operation()
  }

  return await serverTiming.measure(name, operation)
}
