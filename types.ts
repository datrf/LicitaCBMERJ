
export enum Modalidade {
  PREGAO_ELETRONICO = "Pregão Eletrônico",
  PREGAO_SRP = "Pregão Eletrônico SRP",
  CONCORRENCIA = "Concorrência Eletrônica",
  DISPENSA_ELETRONICA = "Dispensa Eletrônica",
  DISPENSA_ART_75 = "Dispensa de Licitação (Art. 75)",
  INEXIGIBILIDADE = "Inexigibilidade",
  ADESAO_ARP = "Adesão a ARP (Carona)"
}

export enum ClassificacaoProcesso {
  VIATURAS = "VIATURAS",
  UNIFORMES = "UNIFORMES",
  SERVICO = "SERVIÇO",
  OPERACIONAL = "OPERACIONAL",
  OBRA = "OBRA",
  EPI = "EPI",
  EMBARCACAO = "EMBARCAÇÃO",
  CONCURSO = "CONCURSO",
  CONCESSIONARIA = "CONCESSIONÁRIA",
  AERONAUTICO = "AERONÁUTICO",
  ADMINISTRATIVO = "ADMINISTRATIVO",
  INSUMOS = "INSUMOS"
}

export enum TipoResultado {
  ADJUDICADO_HOMOLOGADO = "Adjudicado/Homologado",
  FRACASSADO = "Fracassado",
  DESERTO = "Deserto",
  REVOGADO = "Revogado",
  ANULADO = "Anulado",
  SUSPENSO = "Suspenso"
}

export enum StatusProcesso {
  DOD = "1 DOD",
  CHECK_LIST = "2 CHECK LIST",
  CHECK_RETIF = "2.0 CHECK Retif",
  PESQ_MERC = "2.1 Pesq. Merc",
  EDITAL = "3 EDITAL",
  PARECER_JUR = "4 PARECER JUR",
  APONTAM_JUR = "4.1 APONTAM JUR",
  CONTROLADORIA = "4.2 CONTROLADORIA / CGE",
  PREGAO_AGENDADO = "5 PREGÃO AGENDADO",
  ANALISE_AMOSTRA = "6 ANÁLISE AMOSTRA",
  HABILITACAO = "6.1 HABILITAÇÃO",
  HOMOLOGACAO = "7 HOMOLOGAÇÃO",
  ATA_RP = "7.1 ATA R P",
  CONTRATO = "7.2 CONTRATO",
  CTT_ASSINADO = "7.3 CTT Assinado",
  PRAZO_ENTREGA = "8 PRAZO DE ENTREGA",
  ENTREGUE = "9 ENTREGUE",
  CONCLUIDO = "9.1 CONCLUÍDO",
  DESERTO = "DESERTO",
  FRACASSADO = "FRACASSADO",
  ARQUIVADO = "ARQUIVADO"
}

export enum SituacaoIRP {
  EM_ELABORACAO = "Em elaboração",
  EM_ANALISE_DGAL = "Em análise (DGAL)",
  AGUARDANDO_APROVACAO = "Aguardando aprovação",
  PUBLICADA = "Publicada",
  CONCLUIDA = "Concluída",
  CANCELADA = "Cancelada"
}

export enum SituacaoContrato {
  VIGENTE = "Vigente",
  EM_EXECUCAO = "Em execução",
  AGUARDANDO_EMPENHO = "Aguardando Empenho",
  SUSPENSO = "Suspenso",
  CANCELADO = "Cancelado/Rescindido",
  FINALIZADO = "Finalizado/Expirado"
}

export enum UnidadeDemandante {
  CBA_VIII = "CBA VIII",
  CBA_X = "CBA X",
  CI_GEP = "CI - GEP",
  CSM_MOP = "CSM/MOP",
  CSM_MOTO = "CSM/MOTO",
  CSM_TEL = "CSM/TEL",
  DGAL = "DGAL",
  DGAS = "DGAS",
  DGEAO = "DGEAO",
  DGEI = "DGEI",
  DGP = "DGP",
  DGS = "DGS",
  DGST = "DGST",
  DGTI = "DGTI",
  EMG = "EMG",
  EXTERNO_ESTADUAL = "EXTERNO - GOV ESTADUAL",
  EXTERNO_FEDERAL = "EXTERNO - GOV FEDERAL",
  FUNESBOM = "FUNESBOM",
  GOA = "GOA",
  SUAD = "SUAD"
}

export enum TipoOrigem {
  ATA = "Ata de Registro de Preços",
  CONTRATO = "Contrato Direto"
}

export enum TipoCodigo {
  CATMAT = "CATMAT (Material)",
  CATSERV = "CATSERV (Serviço)",
  ID_SIGA = "ID SIGA (Interno)"
}

export interface Processo {
  id: string;
  numeroProcessoSei: string;
  processosRelacionados?: string[];
  numeroPregao?: string;
  modalidade: Modalidade;
  classificacao: ClassificacaoProcesso;
  status: StatusProcesso;
  ano: number;
  anoPlanejamento: number;
  dataInicio: string;
  dataUltimaMovimentacao: string;
  objeto: string;
  setorRequisitante?: UnidadeDemandante | string; 
  origemIrpId?: string;
  qtdParticipantesExternos?: number;
  historicoNumeros?: string[];
}

export interface ItemProcesso {
  id: string;
  processoSeiId: string;
  numeroItem: number;
  codigoItem: string;
  tipoCodigo: TipoCodigo;
  descricao: string;
  quantidadeEstimada: number;
  valorUnitarioEstimado: number;
  valorUnitario?: number; // Novo: Valor final após homologação
  origemIrpItemId?: string;
}

export interface IrpCabecalho {
  id: string;
  numeroIrp: string;
  origem: string;
  orgaoGerenciador: string;
  situacao: SituacaoIRP;
  dataAbertura: string;
  dataLimite: string;
  numeroProcessoSei: string;
  processoGerenciador?: string;
  processoParticipante?: string;
  outrosProcessos?: string[];
  objeto: string;
  arquivado?: boolean;
}

export interface IrpItem {
  id: string;
  irpId: string;
  codigoItem: string;
  tipoCodigo: TipoCodigo;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  numeroProcessoSeiGerado?: string;
}

export interface HistoricoAditivo {
  termo: string;
  processoSei: string;
  mesesAdicionados: number;
  dataAlteracao: string;
  novoVencimento: string;
}

export interface AtaSrp {
  id: string;
  processoSeiId: string;
  numeroAta: string;
  dataAssinatura: string;
  dataVencimento: string;
  fornecedor: string;
  prorrogacao: boolean;
  situacao: SituacaoContrato;
  objeto: string;
  arquivado?: boolean;
  historicoAditivos?: HistoricoAditivo[];
}

export interface ItemAta {
  id: string;
  ataId: string;
  codigoItem: string;
  tipoCodigo: TipoCodigo;
  descricao: string;
  quantidadeRegistrada: number;
  quantidadeConsumida: number; 
  valorUnitario: number;
}

export interface Contrato {
  id: string;
  ataId?: string;
  processoSeiId?: string;
  numeroContrato: string;
  fornecedor: string;
  dataInicio: string;
  dataFim: string;
  valorGlobal: number;
  situacao: SituacaoContrato;
  objeto: string;
  arquivado?: boolean;
  termoAditivo?: string;
  processoSeiAditivo?: string;
  historicoAditivos?: HistoricoAditivo[];
}

export interface MovimentoConsumo {
  id: string;
  tipoOrigem: TipoOrigem;
  origemId: string;
  quantidadeConsumida: number;
  data: string;
  unidadeDemandante: UnidadeDemandante;
  processoSeiConsumo?: string;
  dataEmpenho?: string;
  prazoEntregaDias?: number;
  previsaoEntrega?: string;
  status?: 'ATIVO' | 'CANCELADO';
  faseExecucao?: 'PEDIDO' | 'CONTRATO' | 'ASSINADO' | 'EMPENHO' | 'ENTREGUE';
  arquivado?: boolean;
}
