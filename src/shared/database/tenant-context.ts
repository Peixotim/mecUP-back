import { AsyncLocalStorage } from 'node:async_hooks'

import { AppError } from '@shared/errors/app-error'

interface TenantContext {
  workshopId: string
}

export const tenantStore = new AsyncLocalStorage<TenantContext>()

export function runWithTenant<T>(workshopId: string, callback: () => T): T {
  return tenantStore.run({ workshopId }, callback)
}

export function tryGetWorkshopId(): string | undefined {
  return tenantStore.getStore()?.workshopId
}

export function currentWorkshopId(): string {
  const ctx = tenantStore.getStore()

  if (!ctx) {
    throw AppError.internal('Tenant context missing')
  }

  return ctx.workshopId
}
