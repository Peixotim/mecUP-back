import argon2 from 'argon2'

import { jsonb, seedId } from './helpers'

export const SEED_PASSWORD = 'mecup@dev123'

const OFICINA_MODELO = seedId('oficina:modelo')
const OFICINA_BETA = seedId('oficina:secundaria')

export const SEED_OFICINA_IDS: readonly string[] = [OFICINA_MODELO, OFICINA_BETA]

const ADMIN = seedId('usuario:modelo:admin')
const GESTOR = seedId('usuario:modelo:gestor')
const MECANICO = seedId('usuario:modelo:mecanico')
const ADMIN_BETA = seedId('usuario:beta:admin')

const CLI_JOAO = seedId('cliente:joao')
const CLI_MARIA = seedId('cliente:maria')
const CLI_CARLOS = seedId('cliente:carlos')
const CLI_FERNANDA = seedId('cliente:fernanda')
const CLI_ROBERTO = seedId('cliente:roberto')
const CLI_BETA = seedId('cliente:beta')

const VEI_JOAO_ARGO = seedId('veiculo:joao:argo')
const VEI_MARIA_ONIX = seedId('veiculo:maria:onix')

const PECA_PASTILHA = seedId('peca:pastilha-dianteira')

const OS_AVALIACAO = seedId('os:modelo:1')
const OS_AUTORIZADA = seedId('os:modelo:2')

const T0 = '2026-06-30T13:00:00.000Z' // recebido
const T1 = '2026-06-30T13:20:00.000Z' // em_diagnostico
const T2 = '2026-06-30T14:00:00.000Z' // aguardando_aprovacao
const T3 = '2026-06-30T15:10:00.000Z' // aprovado (autorização)
const T4 = '2026-06-30T15:30:00.000Z' // em_reparo

const HIST_OS2_APROVADO = seedId('hist:os2:aprovado')

export interface SeedDataset {
  oficinas: Record<string, unknown>[]
  usuarios: Record<string, unknown>[]
  clientes: Record<string, unknown>[]
  veiculos: Record<string, unknown>[]
  pecas: Record<string, unknown>[]
  ordensServico: Record<string, unknown>[]
  itensOs: Record<string, unknown>[]
  movimentacoesEstoque: Record<string, unknown>[]
  movimentacoesFinanceiras: Record<string, unknown>[]
  historicoStatusOs: Record<string, unknown>[]
  logsNotificacao: Record<string, unknown>[]
}

/**
 * Monta o conjunto completo de dados de exemplo, respeitando a ordem de FK e as
 * regras de consistência da modelagem (ver `docs/mecup-modelagem-banco.md` §9):
 * valores dos três "baldes", total = soma dos itens, item mistos (peça vinculada
 * + texto livre), receita da OS autorizada e baixa de estoque coerente.
 */
export async function buildSeedDataset(): Promise<SeedDataset> {
  const senhaHash = await argon2.hash(SEED_PASSWORD)

  const oficinas = [
    {
      id: OFICINA_MODELO,
      nome: 'Oficina Modelo',
      cnpj: '12345678000190',
      telefone: '5531990000000',
      endereco: 'Av. dos Andradas, 1000 - Belo Horizonte/MG',
      configuracoes: jsonb({ seed: true, notificarEm: ['pronto_retirada'] }),
      proximo_numero_os: 3,
    },
    {
      id: OFICINA_BETA,
      nome: 'Auto Center Beta',
      cnpj: '98765432000110',
      telefone: '5511990000000',
      endereco: 'Rua Beta, 250 - São Paulo/SP',
      configuracoes: jsonb({ seed: true }),
      proximo_numero_os: 1,
    },
  ]

  const usuario = (
    id: string,
    oficinaId: string,
    nome: string,
    email: string,
    telefone: string,
    papel: 'admin' | 'gestor' | 'mecanico',
  ): Record<string, unknown> => ({
    id,
    oficina_id: oficinaId,
    nome,
    email,
    senha_hash: senhaHash,
    telefone,
    papel,
    ativo: true,
  })

  const usuarios = [
    usuario(
      ADMIN,
      OFICINA_MODELO,
      'Ana Admin',
      'admin@oficinamodelo.dev',
      '5531990001000',
      'admin',
    ),
    usuario(
      GESTOR,
      OFICINA_MODELO,
      'Gilberto Gestor',
      'gestor@oficinamodelo.dev',
      '5531990001001',
      'gestor',
    ),
    usuario(
      MECANICO,
      OFICINA_MODELO,
      'Marcos Mecânico',
      'mecanico@oficinamodelo.dev',
      '5531990001002',
      'mecanico',
    ),
    usuario(
      ADMIN_BETA,
      OFICINA_BETA,
      'Beatriz Beta',
      'admin@autocenterbeta.dev',
      '5511990001000',
      'admin',
    ),
  ]

  const cliente = (
    id: string,
    oficinaId: string,
    nome: string,
    whatsapp: string,
    email: string | null,
    cpfCnpj: string | null,
  ): Record<string, unknown> => ({
    id,
    oficina_id: oficinaId,
    nome,
    whatsapp,
    email,
    cpf_cnpj: cpfCnpj,
    observacoes: null,
  })

  const clientes = [
    cliente(
      CLI_JOAO,
      OFICINA_MODELO,
      'João Silva',
      '5531990001111',
      'joao@example.dev',
      '11122233344',
    ),
    cliente(
      CLI_MARIA,
      OFICINA_MODELO,
      'Maria Souza',
      '5531990002222',
      'maria@example.dev',
      '22233344455',
    ),
    cliente(CLI_CARLOS, OFICINA_MODELO, 'Carlos Pereira', '5531990003333', null, '33344455566'),
    cliente(
      CLI_FERNANDA,
      OFICINA_MODELO,
      'Fernanda Lima',
      '5531990004444',
      'fernanda@example.dev',
      null,
    ),
    cliente(CLI_ROBERTO, OFICINA_MODELO, 'Roberto Alves', '5531990005555', null, null),
    cliente(CLI_BETA, OFICINA_BETA, 'Cliente Beta', '5511990009999', null, null),
  ]

  const veiculo = (
    id: string,
    oficinaId: string,
    clienteId: string,
    placa: string,
    marca: string,
    modelo: string,
    ano: number,
    cor: string,
    km: number,
  ): Record<string, unknown> => ({
    id,
    oficina_id: oficinaId,
    cliente_id: clienteId,
    placa,
    marca,
    modelo,
    ano,
    cor,
    km,
    chassi: null,
    apelido: null,
  })

  const veiculos = [
    veiculo(
      VEI_JOAO_ARGO,
      OFICINA_MODELO,
      CLI_JOAO,
      'PXR2J18',
      'Fiat',
      'Argo',
      2020,
      'Prata',
      48000,
    ),
    veiculo(
      seedId('veiculo:joao:gol'),
      OFICINA_MODELO,
      CLI_JOAO,
      'ABC1D23',
      'Volkswagen',
      'Gol',
      2015,
      'Branco',
      120000,
    ),
    veiculo(
      VEI_MARIA_ONIX,
      OFICINA_MODELO,
      CLI_MARIA,
      'DEF4G56',
      'Chevrolet',
      'Onix',
      2019,
      'Preto',
      62000,
    ),
    veiculo(
      seedId('veiculo:carlos:hb20'),
      OFICINA_MODELO,
      CLI_CARLOS,
      'GHI7J89',
      'Hyundai',
      'HB20',
      2018,
      'Vermelho',
      75000,
    ),
    veiculo(
      seedId('veiculo:fernanda:corolla'),
      OFICINA_MODELO,
      CLI_FERNANDA,
      'JKL0M12',
      'Toyota',
      'Corolla',
      2021,
      'Cinza',
      30000,
    ),
    veiculo(
      seedId('veiculo:roberto:civic'),
      OFICINA_MODELO,
      CLI_ROBERTO,
      'NOP3Q45',
      'Honda',
      'Civic',
      2017,
      'Azul',
      90000,
    ),
    veiculo(
      seedId('veiculo:beta:uno'),
      OFICINA_BETA,
      CLI_BETA,
      'ZZZ9Z99',
      'Fiat',
      'Uno',
      2012,
      'Branco',
      150000,
    ),
  ]

  const peca = (
    key: string,
    codigo: string,
    nome: string,
    fabricante: string,
    unidade: string,
    precoCusto: number,
    precoVenda: number,
    quantidadeEstoque: number,
    estoqueMinimo: number,
    localizacao: string,
  ): Record<string, unknown> => ({
    id: seedId(key),
    oficina_id: OFICINA_MODELO,
    codigo,
    nome,
    fabricante,
    unidade,
    preco_custo: precoCusto,
    preco_venda: precoVenda,
    quantidade_estoque: quantidadeEstoque,
    estoque_minimo: estoqueMinimo,
    localizacao,
  })

  const pecas = [
    peca(
      'peca:filtro-oleo',
      'FIL-OLEO-001',
      'Filtro de óleo',
      'Tecfil',
      'un',
      12,
      30,
      40,
      10,
      'A1',
    ),
    peca('peca:filtro-ar', 'FIL-AR-002', 'Filtro de ar', 'Mann', 'un', 18, 45, 25, 8, 'A2'),
    peca(
      'peca:oleo-5w30',
      'OLEO-5W30-1L',
      'Óleo 5W30 sintético',
      'Mobil',
      'L',
      28,
      55,
      60,
      20,
      'B1',
    ),
    {
      ...peca(
        'peca:pastilha-dianteira',
        'PAST-FR-DIA',
        'Pastilha de freio dianteira',
        'Bosch',
        'jogo',
        90,
        210,
        15,
        5,
        'C1',
      ),
      id: PECA_PASTILHA,
    },
    peca(
      'peca:disco-freio',
      'DISC-FR-DIA',
      'Disco de freio dianteiro',
      'Fremax',
      'par',
      160,
      320,
      8,
      4,
      'C2',
    ),
    peca('peca:vela', 'VELA-IGN-04', 'Vela de ignição', 'NGK', 'un', 15, 38, 50, 12, 'D1'),
    peca('peca:correia', 'CORR-DENT-01', 'Correia dentada', 'Gates', 'un', 70, 160, 10, 4, 'D2'),
    peca('peca:bateria', 'BAT-60AH', 'Bateria 60Ah', 'Moura', 'un', 320, 560, 6, 3, 'E1'),
    // Estoque abaixo do mínimo de propósito (exercita o índice de estoque baixo).
    peca(
      'peca:amortecedor',
      'AMORT-DIA-01',
      'Amortecedor dianteiro',
      'Cofap',
      'un',
      180,
      380,
      3,
      4,
      'E2',
    ),
    peca(
      'peca:palheta',
      'LIMP-PARA-24',
      'Palheta limpador 24"',
      'Bosch',
      'par',
      22,
      48,
      30,
      10,
      'F1',
    ),
  ]

  const os2Material = 210
  const os2MaoObra = 160
  const os2Terceiros = 120
  const os2Total = os2Material + os2MaoObra + os2Terceiros

  const ordensServico = [
    {
      id: OS_AVALIACAO,
      oficina_id: OFICINA_MODELO,
      numero: 1,
      cliente_id: CLI_JOAO,
      veiculo_id: VEI_JOAO_ARGO,
      mecanico_id: MECANICO,
      tipo: 'avaliacao',
      status: 'em_diagnostico',
      status_financeiro: 'pendente',
      conferido_financeiro: false,
      estoque_baixado: false,
      problema_relatado: 'Barulho na dianteira ao frear.',
      diagnostico: null,
      valor_material: 0,
      valor_mao_obra: 0,
      valor_servicos_terceiros: 0,
      valor_total: 0,
      valor_autorizado: null,
      autorizado_em: null,
      autorizado_por: null,
      prazo: null,
      data_conclusao: null,
    },
    {
      id: OS_AUTORIZADA,
      oficina_id: OFICINA_MODELO,
      numero: 2,
      cliente_id: CLI_MARIA,
      veiculo_id: VEI_MARIA_ONIX,
      mecanico_id: MECANICO,
      tipo: 'ordem_servico',
      status: 'em_reparo',
      status_financeiro: 'a_receber',
      conferido_financeiro: false,
      estoque_baixado: true,
      problema_relatado: 'Troca de pastilhas e revisão de freios.',
      diagnostico: 'Pastilhas dianteiras gastas; disco dentro do limite.',
      valor_material: os2Material,
      valor_mao_obra: os2MaoObra,
      valor_servicos_terceiros: os2Terceiros,
      valor_total: os2Total,
      valor_autorizado: os2Total,
      autorizado_em: T3,
      autorizado_por: ADMIN,
      prazo: '2026-07-02T18:00:00.000Z',
      data_conclusao: null,
    },
  ]

  const itensOs = [
    {
      // Item vinculado ao catálogo (habilita baixa de estoque e custo real).
      id: seedId('item:os2:pastilha'),
      oficina_id: OFICINA_MODELO,
      ordem_servico_id: OS_AUTORIZADA,
      peca_id: PECA_PASTILHA,
      tipo: 'material',
      descricao: 'Pastilha de freio dianteira',
      quantidade: 1,
      valor_unitario: 210,
      valor_total: 210,
    },
    {
      id: seedId('item:os2:mao-obra'),
      oficina_id: OFICINA_MODELO,
      ordem_servico_id: OS_AUTORIZADA,
      peca_id: null,
      tipo: 'mao_obra',
      descricao: 'Mão de obra - troca de pastilhas',
      quantidade: 2,
      valor_unitario: 80,
      valor_total: 160,
    },
    {
      id: seedId('item:os2:terceiro'),
      oficina_id: OFICINA_MODELO,
      ordem_servico_id: OS_AUTORIZADA,
      peca_id: null,
      tipo: 'servico_terceiro',
      descricao: 'Retífica de disco (serviço terceirizado)',
      quantidade: 1,
      valor_unitario: 120,
      valor_total: 120,
    },
  ]

  const movimentacoesEstoque = [
    {
      id: seedId('mov-estoque:os2:pastilha'),
      oficina_id: OFICINA_MODELO,
      peca_id: PECA_PASTILHA,
      ordem_servico_id: OS_AUTORIZADA,
      usuario_id: MECANICO,
      tipo: 'saida',
      quantidade: 1,
      motivo: 'Consumo na OS #2',
    },
  ]

  const movimentacoesFinanceiras = [
    {
      id: seedId('mov-fin:os2:receita'),
      oficina_id: OFICINA_MODELO,
      ordem_servico_id: OS_AUTORIZADA,
      tipo: 'receita',
      categoria: 'servico',
      descricao: 'Receita da OS #2',
      valor: os2Total,
      status: 'a_receber',
      forma_pagamento: null,
      data_vencimento: '2026-07-05T03:00:00.000Z',
      data_pagamento: null,
    },
  ]

  const hist = (
    key: string,
    ordemServicoId: string,
    usuarioId: string,
    statusAnterior: string | null,
    statusNovo: string,
    createdAt: string,
    notificado = false,
  ): Record<string, unknown> => ({
    id: seedId(key),
    oficina_id: OFICINA_MODELO,
    ordem_servico_id: ordemServicoId,
    usuario_id: usuarioId,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    observacao: null,
    notificado,
    created_at: createdAt,
  })

  const historicoStatusOs = [
    hist('hist:os1:recebido', OS_AVALIACAO, ADMIN, null, 'recebido', '2026-07-01T12:00:00.000Z'),
    hist(
      'hist:os1:diag',
      OS_AVALIACAO,
      MECANICO,
      'recebido',
      'em_diagnostico',
      '2026-07-01T12:30:00.000Z',
    ),

    hist('hist:os2:recebido', OS_AUTORIZADA, ADMIN, null, 'recebido', T0),
    hist('hist:os2:diag', OS_AUTORIZADA, MECANICO, 'recebido', 'em_diagnostico', T1),
    hist('hist:os2:aguard', OS_AUTORIZADA, MECANICO, 'em_diagnostico', 'aguardando_aprovacao', T2),
    {
      ...hist(
        'hist:os2:aprovado',
        OS_AUTORIZADA,
        ADMIN,
        'aguardando_aprovacao',
        'aprovado',
        T3,
        true,
      ),
      id: HIST_OS2_APROVADO,
    },
    hist('hist:os2:reparo', OS_AUTORIZADA, MECANICO, 'aprovado', 'em_reparo', T4),
  ]

  const logsNotificacao = [
    {
      id: seedId('log-notif:os2:aprovado'),
      oficina_id: OFICINA_MODELO,
      ordem_servico_id: OS_AUTORIZADA,
      historico_status_id: HIST_OS2_APROVADO,
      destino: '5531990002222',
      mensagem: 'Olá! O orçamento da sua OS #2 foi aprovado e o reparo já começou.',
      status: 'enviado',
      provider_message_id: null,
      erro: null,
    },
  ]

  return {
    oficinas,
    usuarios,
    clientes,
    veiculos,
    pecas,
    ordensServico,
    itensOs,
    movimentacoesEstoque,
    movimentacoesFinanceiras,
    historicoStatusOs,
    logsNotificacao,
  }
}
