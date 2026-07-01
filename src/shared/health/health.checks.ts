import { pingPostgres } from '@database/data-source/postgres'
import { pingRedis } from '@shared/redis/redis'

type DependencyPing = () => Promise<void>

export interface DependencyHealth {
  status: 'UP' | 'DOWN'
  error?: string
}

const dependencyChecks = {
  postgres: pingPostgres,
  redis: pingRedis,
} satisfies Record<string, DependencyPing>

export type DependencyName = keyof typeof dependencyChecks
export type DependencyReport = Record<DependencyName, DependencyHealth>

export interface ReadinessReport {
  healthy: boolean
  dependencies: DependencyReport
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}

async function inspect(ping: DependencyPing): Promise<DependencyHealth> {
  try {
    await ping()
    return { status: 'UP' }
  } catch (error) {
    return { status: 'DOWN', error: describeError(error) }
  }
}

export async function checkReadiness(): Promise<ReadinessReport> {
  const results = await Promise.all(
    Object.entries(dependencyChecks).map(
      async ([name, ping]) => [name, await inspect(ping)] as const,
    ),
  )

  const dependencies = Object.fromEntries(results) as DependencyReport
  const healthy = results.every(([, health]) => health.status === 'UP')

  return { healthy, dependencies }
}
