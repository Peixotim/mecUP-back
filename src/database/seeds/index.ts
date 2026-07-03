import type { DataSource, EntityManager } from 'typeorm'

import { logger } from '@shared/logger/logger'

import { buildSeedDataset, SEED_OFICINA_IDS } from './dataset'
import { insertRows } from './helpers'

/**
 * Popula o ambiente de desenvolvimento com dados de exemplo realistas.
 *
 * Idempotente: reexecutar não duplica registros (ids determinísticos +
 * `ON CONFLICT (id) DO NOTHING`). Toda a carga roda em uma única transação.
 */
export async function runSeeds(dataSource: DataSource): Promise<void> {
  const data = await buildSeedDataset()

  await dataSource.transaction(async (manager: EntityManager) => {
    await insertRows(manager, 'oficinas', data.oficinas)
    await insertRows(manager, 'usuarios', data.usuarios)
    await insertRows(manager, 'clientes', data.clientes)
    await insertRows(manager, 'veiculos', data.veiculos)
    await insertRows(manager, 'pecas', data.pecas)
    await insertRows(manager, 'ordens_servico', data.ordensServico)
    await insertRows(manager, 'itens_os', data.itensOs)
    await insertRows(manager, 'movimentacoes_estoque', data.movimentacoesEstoque)
    await insertRows(manager, 'movimentacoes_financeiras', data.movimentacoesFinanceiras)
    await insertRows(manager, 'historico_status_os', data.historicoStatusOs)
    await insertRows(manager, 'logs_notificacao', data.logsNotificacao)
  })

  logger.info(
    { oficinas: data.oficinas.length, usuarios: data.usuarios.length },
    '[seed] dados de exemplo carregados',
  )
}

const RESET_TABLES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'logs_notificacao', column: 'oficina_id' },
  { table: 'historico_status_os', column: 'oficina_id' },
  { table: 'movimentacoes_financeiras', column: 'oficina_id' },
  { table: 'movimentacoes_estoque', column: 'oficina_id' },
  { table: 'itens_os', column: 'oficina_id' },
  { table: 'ordens_servico', column: 'oficina_id' },
  { table: 'veiculos', column: 'oficina_id' },
  { table: 'clientes', column: 'oficina_id' },
  { table: 'pecas', column: 'oficina_id' },
  { table: 'usuarios', column: 'oficina_id' },
  { table: 'oficinas', column: 'id' },
]

/**
 * Remove apenas os dados de exemplo (as oficinas de seed e tudo que pende
 * delas), deixando qualquer outro dado real intacto. `DELETE` físico para um
 * reset limpo — não é soft delete.
 */
export async function resetSeeds(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager: EntityManager) => {
    for (const { table, column } of RESET_TABLES) {
      await manager.query(`DELETE FROM ${table} WHERE ${column} = ANY($1::uuid[])`, [
        SEED_OFICINA_IDS,
      ])
    }
  })

  logger.info('[seed] dados de exemplo removidos')
}
