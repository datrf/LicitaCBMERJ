
import { Processo, ItemProcesso, StatusProcesso, Modalidade, UnidadeDemandante, IrpCabecalho, IrpItem, SituacaoIRP, AtaSrp, ItemAta, Contrato, SituacaoContrato, MovimentoConsumo, TipoOrigem, TipoCodigo, ClassificacaoProcesso } from './types';

// Mock Data updated to reflect new Enums and Schema for Phase 3
export const MOCK_PROCESSOS: Processo[] = [
  {
    id: 'SEI-240001/000123/2024',
    numeroProcessoSei: 'SEI-240001/000123/2024',
    processosRelacionados: ['SEI-240001/999111/2024'], // Example of related process
    numeroPregao: 'PE 012/2024',
    objeto: 'Aquisição de Veículos de Combate a Incêndio (ABT)',
    setorRequisitante: UnidadeDemandante.DGAL,
    status: StatusProcesso.PESQ_MERC,
    modalidade: Modalidade.PREGAO_SRP,
    classificacao: ClassificacaoProcesso.VIATURAS,
    ano: 2024,
    anoPlanejamento: 2024,
    dataInicio: '2024-02-15T09:00:00',
    dataUltimaMovimentacao: '2024-05-20T14:30:00', // Recent
    qtdParticipantesExternos: 3 // Example: 3 other organs participating
  },
  {
    id: 'SEI-240001/000456/2024',
    numeroProcessoSei: 'SEI-240001/000456/2024',
    numeroPregao: 'PE 015/2024',
    objeto: 'Contratação de Serviço de Limpeza e Conservação',
    setorRequisitante: UnidadeDemandante.SUAD, // Was QCEL
    status: StatusProcesso.EDITAL,
    modalidade: Modalidade.PREGAO_ELETRONICO,
    classificacao: ClassificacaoProcesso.SERVICO,
    ano: 2024,
    anoPlanejamento: 2025,
    dataInicio: '2024-03-01T08:00:00',
    dataUltimaMovimentacao: '2024-04-10T10:00:00', // Bit old
    qtdParticipantesExternos: 0
  },
  {
    id: 'SEI-240001/000789/2024',
    numeroProcessoSei: 'SEI-240001/000789/2024',
    processosRelacionados: [],
    objeto: 'Aquisição de Equipamentos de Proteção Individual (EPI)',
    setorRequisitante: UnidadeDemandante.CBA_VIII, // Was CBA_I
    status: StatusProcesso.CONTRATO,
    modalidade: Modalidade.ADESAO_ARP,
    classificacao: ClassificacaoProcesso.EPI,
    ano: 2024,
    anoPlanejamento: 2024,
    dataInicio: '2024-01-10T11:00:00',
    dataUltimaMovimentacao: '2024-06-01T15:00:00',
    qtdParticipantesExternos: 0
  },
  {
    id: 'SEI-240001/000999/2024',
    numeroProcessoSei: 'SEI-240001/000999/2024',
    objeto: 'Manutenção de Extintores',
    setorRequisitante: UnidadeDemandante.DGS,
    status: StatusProcesso.DOD,
    modalidade: Modalidade.DISPENSA_ART_75,
    classificacao: ClassificacaoProcesso.SERVICO,
    ano: 2024,
    anoPlanejamento: 2024,
    dataInicio: '2024-05-20T13:00:00',
    dataUltimaMovimentacao: '2024-05-21T09:00:00',
    qtdParticipantesExternos: 0
  },
  {
    id: 'SEI-240001/001001/2024',
    numeroProcessoSei: 'SEI-240001/001001/2024',
    processosRelacionados: ['SEI-240001/888888/2023', 'SEI-240001/777777/2023'],
    numeroPregao: 'PE 005/2024',
    objeto: 'Compra de Medicamentos de Uso Geral',
    setorRequisitante: UnidadeDemandante.DGS,
    status: StatusProcesso.APONTAM_JUR,
    modalidade: Modalidade.PREGAO_SRP,
    classificacao: ClassificacaoProcesso.INSUMOS,
    ano: 2024,
    anoPlanejamento: 2025,
    dataInicio: '2024-04-10T10:00:00',
    dataUltimaMovimentacao: '2024-04-25T16:00:00', // Idle!
    qtdParticipantesExternos: 5
  }
];

export const MOCK_ITENS_PROCESSO: ItemProcesso[] = [
  // Processo 1 (ABT)
  {
    id: 'item-proc-01',
    processoSeiId: 'SEI-240001/000123/2024',
    numeroItem: 1,
    codigoItem: 'CATMAT 45220',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Auto Bomba Tanque (ABT) - 5000L',
    quantidadeEstimada: 10,
    valorUnitarioEstimado: 1500000.00,
    origemIrpItemId: 'item-01' // Linking to previous mocked IRP for realism
  },
  // Processo 2 (Limpeza)
  {
    id: 'item-proc-02',
    processoSeiId: 'SEI-240001/000456/2024',
    numeroItem: 1,
    codigoItem: 'CATSERV 25001',
    tipoCodigo: TipoCodigo.CATSERV,
    descricao: 'Posto de Servente de Limpeza 44h',
    quantidadeEstimada: 12,
    valorUnitarioEstimado: 180000.00 // Anual
  },
  {
    id: 'item-proc-03',
    processoSeiId: 'SEI-240001/000456/2024',
    numeroItem: 2,
    codigoItem: 'CATSERV 25002',
    tipoCodigo: TipoCodigo.CATSERV,
    descricao: 'Posto de Encarregado 44h',
    quantidadeEstimada: 2,
    valorUnitarioEstimado: 240000.00 // Anual
  },
  // Processo 3 (EPI)
  {
    id: 'item-proc-04',
    processoSeiId: 'SEI-240001/000789/2024',
    numeroItem: 1,
    codigoItem: 'CATMAT 33100',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Capacete de Gallet Fotoluminescente',
    quantidadeEstimada: 200,
    valorUnitarioEstimado: 2500.00
  },
  // Processo 4 (Extintores)
  {
    id: 'item-proc-05',
    processoSeiId: 'SEI-240001/000999/2024',
    numeroItem: 1,
    codigoItem: 'CATSERV 88001',
    tipoCodigo: TipoCodigo.CATSERV,
    descricao: 'Recarga de Pó Químico ABC 4kg',
    quantidadeEstimada: 500,
    valorUnitarioEstimado: 100.00
  },
   // Processo 5 (Medicamentos)
   {
    id: 'item-proc-06',
    processoSeiId: 'SEI-240001/001001/2024',
    numeroItem: 1,
    codigoItem: 'CATMAT 11050',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Dipirona Sódica 500mg/ml - Ampola',
    quantidadeEstimada: 5000,
    valorUnitarioEstimado: 2.50
  },
  {
    id: 'item-proc-07',
    processoSeiId: 'SEI-240001/001001/2024',
    numeroItem: 2,
    codigoItem: 'CATMAT 11055',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Morfina 10mg - Ampola',
    quantidadeEstimada: 1000,
    valorUnitarioEstimado: 15.00
  }
];

// --- MOCK IRP DATA ---
export const MOCK_IRPS: IrpCabecalho[] = [
    {
        id: 'irp-001',
        numeroIrp: '05/2024',
        origem: 'UASG 925000',
        orgaoGerenciador: 'CBMERJ/DGAL',
        situacao: SituacaoIRP.EM_ELABORACAO,
        dataAbertura: '2024-06-01',
        dataLimite: '2024-06-30',
        numeroProcessoSei: 'SEI-240001/005555/2024', // Legacy (Participante)
        processoParticipante: 'SEI-240001/005555/2024',
        processoGerenciador: 'SEI-240001/001111/2024', // Internal link or External ID
        outrosProcessos: ['SEI-240001/000001/2024'],
        objeto: 'Aquisição de Uniformes Operacionais e Coturnos'
    },
    {
        id: 'irp-002',
        numeroIrp: '08/2024',
        origem: 'UASG 925000',
        orgaoGerenciador: 'CBMERJ/DGT',
        situacao: SituacaoIRP.PUBLICADA,
        dataAbertura: '2024-05-15',
        dataLimite: '2024-05-25',
        numeroProcessoSei: 'SEI-240001/006666/2024',
        processoParticipante: 'SEI-240001/006666/2024',
        objeto: 'Material de Informática (Computadores e Periféricos)'
    }
];

export const MOCK_IRP_ITENS: IrpItem[] = [
    // Items for IRP 001
    {
        id: 'item-01',
        irpId: 'irp-001',
        codigoItem: 'CATMAT 88501',
        tipoCodigo: TipoCodigo.CATMAT,
        descricao: 'Gandola Camuflada Ripstop Tam M',
        unidade: 'UN',
        quantidade: 500,
        valorUnitario: 250.00
    },
    {
        id: 'item-02',
        irpId: 'irp-001',
        codigoItem: 'CATMAT 88502',
        tipoCodigo: TipoCodigo.CATMAT,
        descricao: 'Calça Camuflada Ripstop Tam M',
        unidade: 'UN',
        quantidade: 500,
        valorUnitario: 220.00
    },
    {
        id: 'item-03',
        irpId: 'irp-001',
        codigoItem: 'CATMAT 88510',
        tipoCodigo: TipoCodigo.CATMAT,
        descricao: 'Coturno Tático Preto Impermeável',
        unidade: 'PAR',
        quantidade: 500,
        valorUnitario: 450.00
    },
    // Items for IRP 002
    {
        id: 'item-04',
        irpId: 'irp-002',
        codigoItem: 'CATMAT 66020',
        tipoCodigo: TipoCodigo.CATMAT,
        descricao: 'Desktop i7 16GB SSD 512GB Monitor 23"',
        unidade: 'UN',
        quantidade: 50,
        valorUnitario: 4500.00,
        numeroProcessoSeiGerado: 'SEI-240001/007001/2024'
    },
    {
        id: 'item-05',
        irpId: 'irp-002',
        codigoItem: 'CATMAT 66100',
        tipoCodigo: TipoCodigo.CATMAT,
        descricao: 'Nobreak 1200VA',
        unidade: 'UN',
        quantidade: 50,
        valorUnitario: 600.00
    }
];

// --- MOCK GOVERNANCE DATA (ATAS & CONTRATOS) ---

export const MOCK_ATAS: AtaSrp[] = [
  {
    id: 'ata-01',
    processoSeiId: 'SEI-240001/000123/2024',
    numeroAta: 'ARP 010/2024',
    dataAssinatura: '2024-01-15',
    dataVencimento: '2025-01-15', // Vigente
    fornecedor: 'FIRE FIGHTING LTDA',
    prorrogacao: true,
    situacao: SituacaoContrato.VIGENTE,
    objeto: 'Aquisição de Veículos de Combate a Incêndio (ABT)'
  },
  {
    id: 'ata-02',
    processoSeiId: 'SEI-240001/001001/2024',
    numeroAta: 'ARP 012/2024',
    dataAssinatura: '2024-02-01',
    dataVencimento: '2024-07-01', // Próximo do vencimento (< 90 dias) for simulation
    fornecedor: 'MEDICAMENTOS RIO S.A.',
    prorrogacao: false,
    situacao: SituacaoContrato.VIGENTE,
    objeto: 'Medicamentos de Uso Geral'
  }
];

export const MOCK_ITENS_ATA: ItemAta[] = [
  // For ATA-01 (ABT)
  {
    id: 'item-ata-01',
    ataId: 'ata-01',
    codigoItem: 'CATMAT 45220',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Auto Bomba Tanque (ABT) - 5000L',
    quantidadeRegistrada: 10,
    quantidadeConsumida: 0, // Calculated dynamically from movements
    valorUnitario: 1500000.00
  },
  // For ATA-02 (Medicamentos)
  {
    id: 'item-ata-02',
    ataId: 'ata-02',
    codigoItem: 'CATMAT 11050',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Dipirona Sódica 500mg/ml - Ampola',
    quantidadeRegistrada: 5000,
    quantidadeConsumida: 0, 
    valorUnitario: 2.50
  },
  {
    id: 'item-ata-03',
    ataId: 'ata-02',
    codigoItem: 'CATMAT 11055',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: 'Morfina 10mg - Ampola',
    quantidadeRegistrada: 1000,
    quantidadeConsumida: 0, 
    valorUnitario: 15.00
  }
];

export const MOCK_CONTRATOS: Contrato[] = [
  {
    id: 'ctt-01',
    ataId: 'ata-01', // Derived from ARP 010
    numeroContrato: '045/2024',
    fornecedor: 'FIRE FIGHTING LTDA',
    dataInicio: '2024-03-01',
    dataFim: '2025-03-01',
    valorGlobal: 6000000.00, // 4 items * 1.5M
    situacao: SituacaoContrato.EM_EXECUCAO,
    objeto: 'Aquisição de 04 Viaturas ABT'
  },
  {
    id: 'ctt-02',
    // Direct contract (no ARP)
    numeroContrato: '050/2024',
    fornecedor: 'LIMP TUDO SERVICOS',
    dataInicio: '2024-01-01',
    dataFim: '2025-01-01',
    valorGlobal: 2400000.00,
    situacao: SituacaoContrato.VIGENTE,
    objeto: 'Serviços de Limpeza e Conservação - QCel'
  }
];

// --- MOCK EXECUTION DATA (MOVIMENTOS CONSUMO) ---

export const MOCK_MOVIMENTOS: MovimentoConsumo[] = [
  // Consumo da ATA 01 (ABT)
  {
    id: 'mov-001',
    tipoOrigem: TipoOrigem.ATA,
    origemId: 'item-ata-01', // Link to ABT Item in Ata
    quantidadeConsumida: 2,
    data: '2024-03-10',
    unidadeDemandante: UnidadeDemandante.CBA_VIII, // Was CBA_I
    dataEmpenho: '2024-03-25',
    prazoEntregaDias: 180,
    previsaoEntrega: '2024-09-21',
    processoSeiConsumo: 'SEI-240001/050100/2024'
  },
  {
    id: 'mov-002',
    tipoOrigem: TipoOrigem.ATA,
    origemId: 'item-ata-01', 
    quantidadeConsumida: 2,
    data: '2024-04-15',
    unidadeDemandante: UnidadeDemandante.CBA_X, // Was CBA_III
    dataEmpenho: '2024-04-30',
    prazoEntregaDias: 180,
    previsaoEntrega: '2024-10-27',
    processoSeiConsumo: 'SEI-240001/050200/2024'
  },
  // Consumo da ATA 02 (Medicamentos) - Dipirona
  {
    id: 'mov-003',
    tipoOrigem: TipoOrigem.ATA,
    origemId: 'item-ata-02', // Dipirona
    quantidadeConsumida: 2000,
    data: '2024-02-20',
    unidadeDemandante: UnidadeDemandante.DGS,
    dataEmpenho: '2024-03-01',
    prazoEntregaDias: 15,
    previsaoEntrega: '2024-03-16',
    processoSeiConsumo: 'SEI-240001/060500/2024'
  },
  {
    id: 'mov-004',
    tipoOrigem: TipoOrigem.ATA,
    origemId: 'item-ata-02', // Dipirona
    quantidadeConsumida: 2500,
    data: '2024-05-10',
    unidadeDemandante: UnidadeDemandante.DGS,
    dataEmpenho: '', // Pendente
    prazoEntregaDias: 0,
    previsaoEntrega: '',
    processoSeiConsumo: 'SEI-240001/060600/2024'
  },
  // Contract Consumption (Optional check)
  {
    id: 'mov-005',
    tipoOrigem: TipoOrigem.CONTRATO,
    origemId: 'ctt-02', // Limpeza
    quantidadeConsumida: 1, // 1 month payment/measurement
    data: '2024-02-01',
    unidadeDemandante: UnidadeDemandante.SUAD, // Was QCEL
    dataEmpenho: '2024-01-15',
    processoSeiConsumo: 'SEI-240001/070800/2024'
  }
];

export const NAV_ITEMS = [
  { label: 'Visão Geral', id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'IRP', id: 'irp', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { label: 'Processos', id: 'bidding', icon: 'M19 21V5a2 2 0 012-2h11a2 2 0 012 2v16a2 2 0 01-2 2H3a2 2 0 01-2-2zm10-5v-6m0 0l3 3m-3-3l-3 3' }, 
  { label: 'Gov. (Atas/Contratos)', id: 'contracts', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Consumo Ata', id: 'execution', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { label: 'Estatísticas', id: 'statistics', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' },
  { label: 'Arquivo', id: 'archive', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { label: 'Inteligência (IA)', id: 'ai', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
];

// Auxiliary Lists for Dropdowns
export const LISTS = {
    MODALIDADES: Object.values(Modalidade),
    UNIDADES: Object.values(UnidadeDemandante).sort((a, b) => a.localeCompare(b)),
    STATUS_PROCESSO: Object.values(StatusProcesso),
    TIPOS_CODIGO: Object.values(TipoCodigo),
    CLASSIFICACOES: Object.values(ClassificacaoProcesso) // Renamed from FINALIDADES
};
