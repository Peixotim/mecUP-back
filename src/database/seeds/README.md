# Seeds de desenvolvimento

Popula o ambiente de **desenvolvimento** com dados realistas para acelerar testes
manuais e o front-end. Baseado em `docs/mecup-modelagem-banco.md`.

## Comandos

```bash
pnpm seed         # popula a base modelo (idempotente)
pnpm seed:reset   # remove apenas os dados de exemplo
```

> **Pré-requisito:** um banco **já migrado** (o schema das tabelas precisa existir).
> As seeds inserem dados; não criam o schema.

## O que é criado

- **2 oficinas** (`Oficina Modelo` + `Auto Center Beta`) para provar o isolamento multi-tenant.
- **Usuários**: na oficina modelo, um `admin`, um `gestor` e um `mecanico`; na segunda, um `admin`.
- **5 clientes** com **veículos** (o João tem 2), placas normalizadas (upper, sem hífen).
- **10 peças** de catálogo (uma propositalmente com estoque abaixo do mínimo).
- **2 ordens de serviço**: uma em `avaliacao` (não autorizada) e uma `ordem_servico`
  autorizada — com itens mistos (peça vinculada + texto livre), os três "baldes"
  coerentes com o total, receita financeira e baixa de estoque.
- Timeline (`historico_status_os`) e um log de notificação.

Todos os usuários de exemplo usam a senha de dev **`mecup@dev123`** (hash argon2).

## Idempotência

Cada registro usa um **UUID determinístico** (`seedId()` em `helpers.ts`) derivado de
uma chave lógica. Os inserts usam `ON CONFLICT (id) DO NOTHING`, então rodar `pnpm seed`
várias vezes nunca duplica dados. O `seed:reset` apaga tudo que pertence às oficinas de
seed, em ordem inversa de FK.

## Segurança

`pnpm seed`/`seed:reset` **recusam rodar** com `NODE_ENV=production`.
