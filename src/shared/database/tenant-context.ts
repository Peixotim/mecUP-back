import { AsyncLocalStorage } from 'node:async_hooks'

import { AppError } from '@shared/errors/app-error'

interface TenantContext {
  oficinaId: string
}

export const tenantStore = new AsyncLocalStorage<TenantContext>()

export function runWithTenant<T>(oficinaId: string, callback: () => T): T {
  return tenantStore.run({ oficinaId }, callback)
}

export function tryGetOficinaId(): string | undefined {
  return tenantStore.getStore()?.oficinaId
}

export function currentOficinaId(): string {
  const ctx = tenantStore.getStore()

  if (!ctx) {
    throw AppError.internal('Tenant context missing')
  }

  return ctx.oficinaId
}
