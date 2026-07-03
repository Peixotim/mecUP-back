import { createHash } from 'node:crypto'

import type { EntityManager } from 'typeorm'

/**
 * Gera um UUID **determinístico** a partir de uma chave lógica.
 *
 * A idempotência da seed depende disso: rodar `npm run seed` de novo produz
 * exatamente os mesmos ids, então o `ON CONFLICT (id) DO NOTHING` dos inserts
 * simplesmente ignora as linhas que já existem — nada é duplicado.
 *
 * O hash é normalizado para o formato UUID v4 (nibble de versão `4` e bits de
 * variante `8`), então é um UUID válido para as colunas `uuid` do schema.
 */
export function seedId(key: string): string {
  const hex = createHash('md5').update(`mecup-seed:${key}`).digest('hex')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

/**
 * Insert idempotente e multi-linha. Todas as linhas precisam ter as **mesmas**
 * colunas (mesmas chaves, na mesma ordem). Colunas ausentes devem vir como
 * `null` explícito para manter o formato uniforme.
 *
 * Usa `ON CONFLICT (id) DO NOTHING` — como os ids são determinísticos
 * (ver {@link seedId}), reexecutar a seed não duplica registros.
 */
export async function insertRows(
  manager: EntityManager,
  table: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<void> {
  if (rows.length === 0) {
    return
  }

  const columns = Object.keys(rows[0])
  const params: unknown[] = []

  const tuples = rows.map((row) => {
    const placeholders = columns.map((column) => {
      params.push(row[column])
      return `$${params.length}`
    })
    return `(${placeholders.join(', ')})`
  })

  const columnList = columns.join(', ')

  await manager.query(
    `INSERT INTO ${table} (${columnList}) VALUES ${tuples.join(', ')} ON CONFLICT (id) DO NOTHING`,
    params,
  )
}

export function jsonb(value: unknown): string {
  return JSON.stringify(value)
}
