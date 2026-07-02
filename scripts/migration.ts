import { spawnSync } from 'node:child_process'
import path from 'node:path'

/**
 * Wrapper do CLI do TypeORM para migrations.
 *
 * Permite passar apenas o NOME da migration (sem o diretório):
 *   pnpm migration:generate CreateUsers
 *   pnpm migration:create   AddOrderIndex
 *
 * O diretório é prefixado automaticamente e o TypeORM adiciona o timestamp,
 * gerando algo como: src/database/migrations/1720000000000-CreateUsers.ts
 */

const MIGRATIONS_DIR = 'src/database/migrations'
const DATA_SOURCE = 'src/database/data-source/postgres.ts'
const TYPEORM_CLI = './node_modules/typeorm/cli.js'

type Action = 'generate' | 'create'

const action = process.argv[2] as Action
const name = process.argv[3]

if (action !== 'generate' && action !== 'create') {
  console.error(`Invalid action "${action ?? ''}". Use "generate" or "create".`)
  process.exit(1)
}

if (!name) {
  console.error(`Migration name is required. Example: pnpm migration:${action} CreateUsers`)
  process.exit(1)
}

const migrationPath = path.posix.join(MIGRATIONS_DIR, name)

// `create` monta um esqueleto vazio (não toca no banco); `generate` faz o diff
// das entities contra o schema atual e por isso precisa do data-source (-d).
const cliArgs =
  action === 'generate'
    ? [TYPEORM_CLI, 'migration:generate', migrationPath, '-d', DATA_SOURCE]
    : [TYPEORM_CLI, 'migration:create', migrationPath]

const result = spawnSync(process.execPath, ['--import', 'tsx', ...cliArgs], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
