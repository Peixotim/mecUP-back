# Mecup — Modelagem de Banco de Dados (PostgreSQL)

> Documento de referência do schema completo do Mecup, modelado para PostgreSQL 16+.


---

## Sumário

1. [Convenções e decisões de arquitetura](#1-convenções-e-decisões-de-arquitetura)
2. [Extensões e tipos (ENUMs)](#2-extensões-e-tipos-enums)
3. [Função e trigger de `updated_at`](#3-função-e-trigger-de-updated_at)
4. [Tabelas globais](#4-tabelas-globais)
5. [Tabelas de negócio (multi-tenant)](#5-tabelas-de-negócio-multi-tenant)
6. [Sequência da OS por oficina](#6-sequência-da-os-por-oficina)
7. [Índices](#7-índices)
8. [Diagrama de relacionamentos](#8-diagrama-de-relacionamentos-resumo)
9. [Notas para as seeds](#9-notas-para-as-seeds)

---

## 1. Convenções e decisões de arquitetura

| Decisão | Escolha | Justificativa (DBA) |
|---|---|---|
| **Chave primária** | `uuid` (v4), default `gen_random_uuid()` | Multi-tenant: evita enumeração sequencial entre oficinas, seguro para expor em API, sem colisão em ambientes distribuídos. |
| **Multi-tenancy** | Coluna `oficina_id` em toda tabela de negócio | Banco único, isolamento na aplicação + FK. Simples de operar no MVP e migrável para schema-per-tenant no futuro. |
| **Valores monetários** | `numeric(12,2)` | Precisão exata. `float`/`double` gera erro de arredondamento — inaceitável em financeiro. |
| **Timestamps** | `timestamptz` (com timezone), default `now()` | Sempre com timezone para evitar ambiguidade. `created_at`/`updated_at` em tudo. |
| **Soft delete** | `deleted_at timestamptz NULL` | Preserva histórico e integridade referencial. Registros "apagados" somem via filtro `WHERE deleted_at IS NULL`. |
| **Unicidade** | Sempre **escopada ao tenant** e **parcial** (ignora soft-deleted) | Placa/e-mail/código são únicos *por oficina*, não globais. Índice único parcial permite recriar após soft delete. |
| **FKs de exclusão** | `RESTRICT` por padrão; `CASCADE` só em dependentes fortes (itens da OS) | Não deixa apagar um cliente que tem OS. Itens seguem a OS. |
| **Status** | `ENUM` nativo do PostgreSQL | Integridade no banco, legibilidade e economia de espaço vs. varchar. |
| **Nomenclatura** | `snake_case`, tabelas no plural | Padrão idiomático PostgreSQL. |

> **Nota sobre unicidade + soft delete:** usamos **índices únicos parciais** (`WHERE deleted_at IS NULL`). Assim, se um cliente for "apagado", a mesma placa/e-mail pode ser reutilizada, mas dois registros ativos nunca colidem.

---

## 2. Extensões e tipos (ENUMs)

```sql
-- ============================================================
-- EXTENSÕES
-- ============================================================
-- gen_random_uuid() vem com pgcrypto (nativo no PG 13+ via extensão)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- unaccent: útil para busca de clientes/peças ignorando acento (autocomplete)
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- pg_trgm: habilita índices GIN trigram para busca por trecho (LIKE '%termo%') no autocomplete
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TIPOS ENUM
-- ============================================================

-- Papéis de usuário
CREATE TYPE papel_usuario AS ENUM ('admin', 'gestor', 'mecanico');

-- Tipo da OS (fonte única: avaliação vira ordem de serviço na autorização)
CREATE TYPE tipo_os AS ENUM ('avaliacao', 'ordem_servico');

-- Status operacional da OS (máquina de estados do carro)
CREATE TYPE status_os AS ENUM (
  'recebido',
  'em_diagnostico',
  'aguardando_aprovacao',
  'aprovado',
  'em_reparo',
  'aguardando_peca',
  'remontagem',
  'pronto_lavagem',
  'lavado',
  'pronto_retirada',
  'entregue',
  'cancelado'
);

-- Status financeiro da OS (trilha independente da operacional)
CREATE TYPE status_financeiro_os AS ENUM ('pendente', 'a_receber', 'pago', 'cancelado');

-- Tipo do item da OS (os três baldes de custo)
CREATE TYPE tipo_item_os AS ENUM ('material', 'mao_obra', 'servico_terceiro');

-- Movimentação de estoque
CREATE TYPE tipo_mov_estoque AS ENUM ('entrada', 'saida', 'ajuste');

-- Movimentação financeira
CREATE TYPE tipo_mov_financeira AS ENUM ('receita', 'despesa');
CREATE TYPE status_mov_financeira AS ENUM ('pendente', 'a_receber', 'pago', 'cancelado');

-- Status de uma notificação (ciclo de vida do envio)
CREATE TYPE status_notificacao AS ENUM ('enfileirado', 'enviado', 'entregue', 'lido', 'falhou');
```

---

## 3. Função e trigger de `updated_at`

```sql
-- ============================================================
-- Função reutilizável: mantém updated_at sempre atualizado
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger é aplicado tabela a tabela (ver cada CREATE TABLE abaixo).
```

---

## 4. Tabelas globais

Entidades que **não** carregam `oficina_id` porque são a raiz do tenant ou dele dependem diretamente sem escopo.

### 4.1 `oficinas` — a raiz multi-tenant

```sql
CREATE TABLE oficinas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          varchar(150) NOT NULL,
  cnpj          varchar(14),
  telefone      varchar(20),
  endereco      text,
  logo_url      text,
  configuracoes jsonb NOT NULL DEFAULT '{}'::jsonb,  -- ex.: { "notificarEm": ["pronto_retirada"] }
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- CNPJ único entre oficinas ativas (parcial: ignora soft-deleted e nulos)
CREATE UNIQUE INDEX uq_oficinas_cnpj
  ON oficinas (cnpj)
  WHERE deleted_at IS NULL AND cnpj IS NOT NULL;

CREATE TRIGGER trg_oficinas_updated_at
  BEFORE UPDATE ON oficinas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.2 `usuarios`

```sql
CREATE TABLE usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  nome        varchar(150) NOT NULL,
  email       varchar(255) NOT NULL,
  senha_hash  varchar(255) NOT NULL,
  telefone    varchar(20),
  papel       papel_usuario NOT NULL DEFAULT 'mecanico',
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- E-mail único POR OFICINA (o mesmo e-mail pode existir em oficinas distintas)
CREATE UNIQUE INDEX uq_usuarios_oficina_email
  ON usuarios (oficina_id, email)
  WHERE deleted_at IS NULL;

CREATE INDEX ix_usuarios_oficina ON usuarios (oficina_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.3 `refresh_tokens` — sessões (rotação e revogação)

```sql
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  varchar(255) NOT NULL,          -- NUNCA o token em claro
  familia_id  uuid NOT NULL,                  -- detecção de reuso (rotação)
  expira_em   timestamptz NOT NULL,
  revogado_em timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_refresh_tokens_usuario ON refresh_tokens (usuario_id);
CREATE INDEX ix_refresh_tokens_familia ON refresh_tokens (familia_id);
CREATE UNIQUE INDEX uq_refresh_tokens_hash ON refresh_tokens (token_hash);
```

> **Nota DBA:** guardamos apenas o **hash** do refresh token. `familia_id` agrupa a cadeia de rotação — se um token já rotacionado for reutilizado, revoga-se a família inteira.

---

## 5. Tabelas de negócio (multi-tenant)

Todas herdam o padrão: `id uuid`, `oficina_id uuid NOT NULL`, timestamps e `deleted_at`.

### 5.1 `clientes`

```sql
CREATE TABLE clientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  nome        varchar(150) NOT NULL,
  whatsapp    varchar(20) NOT NULL,           -- normalizado: só dígitos + DDI
  email       varchar(255),
  cpf_cnpj    varchar(14),
  observacoes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Busca/autocomplete por WhatsApp dentro da oficina
CREATE INDEX ix_clientes_oficina_whatsapp
  ON clientes (oficina_id, whatsapp) WHERE deleted_at IS NULL;

-- Busca por nome (case/acento-insensível) — trigram para LIKE '%termo%'
CREATE INDEX ix_clientes_nome_trgm
  ON clientes USING gin (lower(unaccent(nome)) gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> **Nota:** os índices trigram (`gin_trgm_ops`) dependem da extensão `pg_trgm`, já habilitada na seção 2. Eles aceleram busca por trecho (`LIKE '%termo%'`) ignorando acento/caixa — ideal para o autocomplete de cliente e peça.

### 5.2 `veiculos`

```sql
CREATE TABLE veiculos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  placa       varchar(8) NOT NULL,            -- normalizada: upper, sem hífen
  marca       varchar(60),
  modelo      varchar(80),
  ano         int,
  cor         varchar(40),
  km          int,
  chassi      varchar(30),
  apelido     varchar(60),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Placa única POR OFICINA (entre veículos ativos)
CREATE UNIQUE INDEX uq_veiculos_oficina_placa
  ON veiculos (oficina_id, placa) WHERE deleted_at IS NULL;

-- Consulta de veículos por cliente (histórico)
CREATE INDEX ix_veiculos_cliente ON veiculos (cliente_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_veiculos_updated_at
  BEFORE UPDATE ON veiculos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.3 `pecas` — catálogo e estoque

```sql
CREATE TABLE pecas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id          uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  codigo              varchar(60),
  nome                varchar(150) NOT NULL,
  fabricante          varchar(80),
  unidade             varchar(10) NOT NULL DEFAULT 'un',
  preco_custo         numeric(12,2) NOT NULL DEFAULT 0,
  preco_venda         numeric(12,2) NOT NULL DEFAULT 0,
  quantidade_estoque  int NOT NULL DEFAULT 0,
  estoque_minimo      int NOT NULL DEFAULT 0,
  localizacao         varchar(60),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,

  CONSTRAINT ck_pecas_estoque_nao_negativo CHECK (quantidade_estoque >= 0),
  CONSTRAINT ck_pecas_precos_nao_negativos CHECK (preco_custo >= 0 AND preco_venda >= 0)
);

-- Código único POR OFICINA (quando informado)
CREATE UNIQUE INDEX uq_pecas_oficina_codigo
  ON pecas (oficina_id, codigo)
  WHERE deleted_at IS NULL AND codigo IS NOT NULL;

-- Autocomplete por nome
CREATE INDEX ix_pecas_nome_trgm
  ON pecas USING gin (lower(unaccent(nome)) gin_trgm_ops) WHERE deleted_at IS NULL;

-- Alerta de estoque baixo (peças ativas)
CREATE INDEX ix_pecas_estoque_baixo
  ON pecas (oficina_id)
  WHERE deleted_at IS NULL AND quantidade_estoque <= estoque_minimo;

CREATE TRIGGER trg_pecas_updated_at
  BEFORE UPDATE ON pecas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.4 `ordens_servico` — o coração (fonte única)

```sql
CREATE TABLE ordens_servico (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id            uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  numero                int NOT NULL,                     -- sequencial POR OFICINA
  cliente_id            uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  veiculo_id            uuid NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
  mecanico_id           uuid REFERENCES usuarios(id) ON DELETE SET NULL,

  tipo                  tipo_os NOT NULL DEFAULT 'avaliacao',
  status                status_os NOT NULL DEFAULT 'recebido',
  status_financeiro     status_financeiro_os NOT NULL DEFAULT 'pendente',
  conferido_financeiro  boolean NOT NULL DEFAULT false,
  estoque_baixado       boolean NOT NULL DEFAULT false,   -- idempotência da baixa

  problema_relatado     text,
  diagnostico           text,

  -- Os três baldes + total (mantidos pela aplicação ao mudar itens)
  valor_material            numeric(12,2) NOT NULL DEFAULT 0,
  valor_mao_obra            numeric(12,2) NOT NULL DEFAULT 0,
  valor_servicos_terceiros  numeric(12,2) NOT NULL DEFAULT 0,
  valor_total               numeric(12,2) NOT NULL DEFAULT 0,

  -- Snapshot da autorização do cliente
  valor_autorizado      numeric(12,2),
  autorizado_em         timestamptz,
  autorizado_por        uuid REFERENCES usuarios(id) ON DELETE SET NULL,

  data_entrada          timestamptz NOT NULL DEFAULT now(),
  prazo                 timestamptz,
  data_conclusao        timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,

  CONSTRAINT ck_os_valores_nao_negativos CHECK (
    valor_material >= 0 AND valor_mao_obra >= 0 AND
    valor_servicos_terceiros >= 0 AND valor_total >= 0
  )
);

-- Número da OS único e sequencial por oficina
CREATE UNIQUE INDEX uq_os_oficina_numero ON ordens_servico (oficina_id, numero);

-- Filtros operacionais mais comuns
CREATE INDEX ix_os_oficina_status
  ON ordens_servico (oficina_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_os_oficina_status_fin
  ON ordens_servico (oficina_id, status_financeiro) WHERE deleted_at IS NULL;
CREATE INDEX ix_os_cliente  ON ordens_servico (cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_os_veiculo  ON ordens_servico (veiculo_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_os_mecanico ON ordens_servico (mecanico_id) WHERE deleted_at IS NULL;

-- Fila de conferência do financeiro
CREATE INDEX ix_os_pendencia_financeira
  ON ordens_servico (oficina_id)
  WHERE deleted_at IS NULL AND conferido_financeiro = false;

CREATE TRIGGER trg_os_updated_at
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.5 `itens_os` — a linha dos três baldes (vínculo opcional)

```sql
CREATE TABLE itens_os (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id        uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  ordem_servico_id  uuid NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  peca_id           uuid REFERENCES pecas(id) ON DELETE SET NULL,  -- NULO = texto livre

  tipo              tipo_item_os NOT NULL,
  descricao         varchar(255) NOT NULL,   -- sempre presente (livre ou herdada da peça)
  quantidade        numeric(10,2) NOT NULL DEFAULT 1,
  valor_unitario    numeric(12,2) NOT NULL DEFAULT 0,
  valor_total       numeric(12,2) NOT NULL DEFAULT 0,  -- quantidade * valor_unitario

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,

  CONSTRAINT ck_itens_os_qtd_positiva CHECK (quantidade > 0),
  CONSTRAINT ck_itens_os_valores_nao_negativos CHECK (valor_unitario >= 0 AND valor_total >= 0)
);

-- Itens de uma OS (carregamento do detalhe)
CREATE INDEX ix_itens_os_ordem ON itens_os (ordem_servico_id) WHERE deleted_at IS NULL;
-- Consumo de uma peça (quais OS usaram)
CREATE INDEX ix_itens_os_peca  ON itens_os (peca_id) WHERE deleted_at IS NULL AND peca_id IS NOT NULL;

CREATE TRIGGER trg_itens_os_updated_at
  BEFORE UPDATE ON itens_os
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> **Regra central modelada aqui:** `peca_id` é **nullable**. Preenchido → item vinculado ao catálogo (habilita baixa de estoque e custo real). Nulo → texto livre ("Pastilha VW — R$ 290"). O `ON DELETE SET NULL` garante que apagar uma peça do catálogo **não** apaga o histórico do item na OS.

### 5.6 `movimentacoes_estoque` — trilha de auditoria

```sql
CREATE TABLE movimentacoes_estoque (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id        uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  peca_id           uuid NOT NULL REFERENCES pecas(id) ON DELETE RESTRICT,
  ordem_servico_id  uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,
  usuario_id        uuid REFERENCES usuarios(id) ON DELETE SET NULL,

  tipo              tipo_mov_estoque NOT NULL,
  quantidade        int NOT NULL,
  motivo            varchar(255),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_mov_estoque_qtd_positiva CHECK (quantidade > 0)
);

CREATE INDEX ix_mov_estoque_peca  ON movimentacoes_estoque (peca_id);
CREATE INDEX ix_mov_estoque_os    ON movimentacoes_estoque (ordem_servico_id);
CREATE INDEX ix_mov_estoque_data  ON movimentacoes_estoque (oficina_id, created_at);
```

> **Nota DBA:** movimentação de estoque é **append-only** (trilha de auditoria) — sem `updated_at`/`deleted_at`. Correções são novas movimentações do tipo `ajuste`, nunca edição do histórico.

### 5.7 `movimentacoes_financeiras`

```sql
CREATE TABLE movimentacoes_financeiras (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id        uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  ordem_servico_id  uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,

  tipo              tipo_mov_financeira NOT NULL,
  categoria         varchar(60) NOT NULL,
  descricao         varchar(255),
  valor             numeric(12,2) NOT NULL,
  status            status_mov_financeira NOT NULL DEFAULT 'pendente',
  forma_pagamento   varchar(40),
  data_vencimento   timestamptz,
  data_pagamento    timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,

  CONSTRAINT ck_mov_fin_valor_positivo CHECK (valor > 0)
);

CREATE INDEX ix_mov_fin_os
  ON movimentacoes_financeiras (ordem_servico_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_mov_fin_oficina_status
  ON movimentacoes_financeiras (oficina_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_mov_fin_periodo
  ON movimentacoes_financeiras (oficina_id, created_at) WHERE deleted_at IS NULL;

-- Uma OS gera no máximo UMA receita automática (idempotência da cobrança)
CREATE UNIQUE INDEX uq_mov_fin_receita_por_os
  ON movimentacoes_financeiras (ordem_servico_id)
  WHERE deleted_at IS NULL AND tipo = 'receita' AND ordem_servico_id IS NOT NULL;

CREATE TRIGGER trg_mov_fin_updated_at
  BEFORE UPDATE ON movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> **Destaque DBA:** o índice único parcial `uq_mov_fin_receita_por_os` **garante no banco** que a autorização não gere cobrança duplicada — a idempotência não fica só na aplicação.

### 5.8 `historico_status_os` — timeline da OS

```sql
CREATE TABLE historico_status_os (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id        uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  ordem_servico_id  uuid NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  usuario_id        uuid REFERENCES usuarios(id) ON DELETE SET NULL,

  status_anterior   status_os,
  status_novo       status_os NOT NULL,
  observacao        varchar(255),
  notificado        boolean NOT NULL DEFAULT false,  -- gancho p/ WhatsApp (futuro)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_hist_status_os
  ON historico_status_os (ordem_servico_id, created_at);
```

> **Nota:** append-only (timeline). `notificado` é o gancho já previsto para a fase de notificação por WhatsApp.

### 5.9 `logs_notificacao` — auditoria de envios

```sql
CREATE TABLE logs_notificacao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id            uuid NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  ordem_servico_id      uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,
  historico_status_id   uuid REFERENCES historico_status_os(id) ON DELETE SET NULL,

  destino               varchar(20) NOT NULL,   -- WhatsApp normalizado
  mensagem              text NOT NULL,
  status                status_notificacao NOT NULL DEFAULT 'enfileirado',
  provider_message_id   varchar(120),
  erro                  text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_logs_notif_os     ON logs_notificacao (ordem_servico_id);
CREATE INDEX ix_logs_notif_status ON logs_notificacao (oficina_id, status);

CREATE TRIGGER trg_logs_notif_updated_at
  BEFORE UPDATE ON logs_notificacao
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 6. Sequência da OS por oficina

O `numero` da OS deve ser **sequencial e independente por oficina** (Oficina A e B começam do 1). Duas abordagens:

**Opção A — Contador na própria oficina (recomendada para consistência transacional):**

```sql
-- Adicionar coluna de contador na tabela oficinas
ALTER TABLE oficinas ADD COLUMN proximo_numero_os int NOT NULL DEFAULT 1;

-- Na criação da OS, dentro da MESMA transação:
--   1) SELECT proximo_numero_os FROM oficinas WHERE id = :oficinaId FOR UPDATE;
--   2) usa o valor como numero da nova OS
--   3) UPDATE oficinas SET proximo_numero_os = proximo_numero_os + 1 WHERE id = :oficinaId;
-- O FOR UPDATE serializa a numeração e evita duplicidade sob concorrência.
```

**Opção B — Trigger `BEFORE INSERT` (numeração automática):**

```sql
CREATE OR REPLACE FUNCTION gerar_numero_os()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    UPDATE oficinas
       SET proximo_numero_os = proximo_numero_os + 1
     WHERE id = NEW.oficina_id
    RETURNING proximo_numero_os - 1 INTO NEW.numero;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_os_numero
  BEFORE INSERT ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION gerar_numero_os();
```

> **Recomendação DBA:** a **Opção A** dá controle explícito na aplicação e é mais fácil de testar; a **Opção B** garante numeração mesmo em inserts diretos no banco (seeds, scripts). Escolha uma e mantenha consistência. Ambas usam `proximo_numero_os` na tabela `oficinas`.

---

## 7. Índices

Todos os índices já estão declarados junto de cada tabela (seção 5). Resumo da estratégia:

| Objetivo | Índice |
|---|---|
| Isolamento/consulta por tenant | `ix_*_oficina*` em todas as tabelas de negócio |
| Autocomplete de cliente/peça | `gin (... gin_trgm_ops)` sobre `unaccent(lower(nome))` |
| Unicidade escopada + soft delete | índices **únicos parciais** `WHERE deleted_at IS NULL` |
| Filtros de OS (board) | `(oficina_id, status)` e `(oficina_id, status_financeiro)` |
| Fila financeira | parcial `WHERE conferido_financeiro = false` |
| Estoque baixo | parcial `WHERE quantidade_estoque <= estoque_minimo` |
| Idempotência da cobrança | único parcial em `movimentacoes_financeiras (ordem_servico_id)` p/ `tipo='receita'` |

> Todas as extensões necessárias (`pgcrypto`, `unaccent`, `pg_trgm`) estão na seção 2 — o script roda de ponta a ponta sem pré-requisitos externos.

---

## 8. Diagrama de relacionamentos (resumo)

```
oficinas (raiz do tenant)
  ├──< usuarios
  │      └──< refresh_tokens
  ├──< clientes
  │      └──< veiculos
  ├──< pecas
  │      └──< movimentacoes_estoque
  └──< ordens_servico
         ├──< itens_os            (peca_id opcional → pecas)
         ├──< historico_status_os
         │       └──< logs_notificacao
         ├──< movimentacoes_financeiras
         └──< movimentacoes_estoque (uso na finalização)

Relações-chave:
- clientes 1──N veiculos
- veiculos 1──N ordens_servico   (e clientes 1──N ordens_servico)
- ordens_servico 1──N itens_os   (CASCADE)
- itens_os N──1 pecas            (opcional, SET NULL)
- ordens_servico 1──1 receita automática em movimentacoes_financeiras (idempotente)
- ordens_servico 1──N historico_status_os (timeline)
```

---

