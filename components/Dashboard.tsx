
import React, { useState, useMemo } from 'react';
import { 
    MOCK_ITENS_ATA, getStatusColor
} from '../constants';
import { StatusProcesso, SituacaoContrato, Processo, ItemProcesso, IrpCabecalho, AtaSrp, Contrato, MovimentoConsumo } from '../types';

interface DashboardProps {
    processes?: Processo[]; 
    items?: ItemProcesso[]; 
    irps?: IrpCabecalho[];
    atas?: AtaSrp[];
    contracts?: Contrato[];
    movements?: MovimentoConsumo[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    processes = [], 
    items = [], 
    irps = [], 
    atas = [], 
    contracts = [], 
    movements = [] 
}) => {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [calculationDetail, setCalculationDetail] = useState<'planejado' | 'executado' | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set(processes.map(p => p.anoPlanejamento).filter(y => y !== undefined));
    return Array.from(years).sort((a, b) => b - a);
  }, [processes]);

  const globalFilteredProcs = useMemo(() => {
      return processes.filter(p => selectedYear === 'all' || p.anoPlanejamento === selectedYear);
  }, [selectedYear, processes]);

  const globalFilteredIrps = useMemo(() => {
      return irps.filter(i => selectedYear === 'all' || new Date(i.dataAbertura).getFullYear() === selectedYear);
  }, [selectedYear, irps]);

  const globalFilteredAtas = useMemo(() => {
      return atas.filter(a => selectedYear === 'all' || new Date(a.dataAssinatura).getFullYear() === selectedYear);
  }, [selectedYear, atas]);

  const globalFilteredContracts = useMemo(() => {
      return contracts.filter(c => selectedYear === 'all' || new Date(c.dataInicio).getFullYear() === selectedYear);
  }, [selectedYear, contracts]);

  const globalFilteredMovements = useMemo(() => {
      return movements.filter(m => selectedYear === 'all' || new Date(m.data).getFullYear() === selectedYear);
  }, [selectedYear, movements]);

  const planejadoAnalitico = useMemo(() => {
    return globalFilteredProcs
      .filter(p => p.status !== StatusProcesso.ARQUIVADO)
      .map(p => {
        const total = items
          .filter(i => i.processoSeiId === p.id)
          .reduce((sum, item) => sum + (item.quantidadeEstimada * (item.valorUnitario || item.valorUnitarioEstimado)), 0);
        return { sei: p.numeroProcessoSei, objeto: p.objeto, valor: total };
      })
      .filter(p => p.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [globalFilteredProcs, items]);

  const totalEstimado = useMemo(() => planejadoAnalitico.reduce((sum, p) => sum + p.valor, 0), [planejadoAnalitico]);

  const valContratos = useMemo(() => globalFilteredContracts.reduce((acc, c) => acc + c.valorGlobal, 0), [globalFilteredContracts]);
  
  const valConsumos = useMemo(() => globalFilteredMovements.reduce((acc, mov) => {
      const itemRef = MOCK_ITENS_ATA.find(i => i.id === mov.origemId);
      const precoUnitario = itemRef ? itemRef.valorUnitario : 0;
      return acc + (mov.quantidadeConsumida * precoUnitario);
  }, 0), [globalFilteredMovements]);

  const totalExecutado = useMemo(() => valContratos + valConsumos, [valContratos, valConsumos]);

  const funnelData = useMemo(() => {
      const phases = { planejamento: 0, licitacao: 0, contratacao: 0 };
      globalFilteredProcs.filter(p => p.status !== StatusProcesso.ARQUIVADO).forEach(p => {
          if ([StatusProcesso.DOD, StatusProcesso.PESQ_MERC, StatusProcesso.CHECK_LIST].includes(p.status)) phases.planejamento++;
          else if ([StatusProcesso.EDITAL, StatusProcesso.PARECER_JUR, StatusProcesso.HABILITACAO, StatusProcesso.PREGAO_AGENDADO].includes(p.status)) phases.licitacao++;
          else phases.contratacao++;
      });
      return phases;
  }, [globalFilteredProcs]);

  const alerts = useMemo(() => {
      const list = [];
      const today = new Date();
      globalFilteredProcs.filter(p => p.status !== StatusProcesso.ARQUIVADO).forEach(p => {
          const lastUpdate = new Date(p.dataUltimaMovimentacao);
          const diffDays = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 30 && ![StatusProcesso.CONCLUIDO, StatusProcesso.FRACASSADO].includes(p.status as any)) {
              list.push({ type: 'danger', msg: `PROCESSO SEI-${p.numeroProcessoSei} PARADO HÁ ${diffDays} DIAS` });
          }
      });
      return list;
  }, [globalFilteredProcs]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Centro de Comando</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base de Dados Unificada (Ativos + Arquivo Morto)</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Exercício:</span>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-slate-50 border-none text-slate-700 text-xs font-black rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
                <option value="all">Histórico Global</option>
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
        </div>
      </div>

      {/* METRICAS VOLUMETRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
              { label: 'IRP', val: globalFilteredIrps.length, color: 'text-blue-600' },
              { label: 'Processos', val: globalFilteredProcs.length, color: 'text-indigo-600' },
              { label: 'Atas', val: globalFilteredAtas.length, color: 'text-emerald-600' },
              { label: 'Contratos', val: globalFilteredContracts.length, color: 'text-purple-600' },
              { label: 'Consumo', val: globalFilteredMovements.length, color: 'text-amber-600' }
          ].map((card, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all hover:border-indigo-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</span>
                  <span className={`text-3xl font-black ${card.color}`}>{card.val}</span>
              </div>
          ))}
      </div>

      {/* BLOCO FINANCEIRO CENTRAL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between border-l-[10px] border-l-slate-200 relative overflow-hidden group">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Planejado (Estimado Total)</p>
                        <h3 className="text-4xl font-black text-slate-800 tracking-tighter">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalEstimado)}
                        </h3>
                    </div>
                    <button 
                        onClick={() => setCalculationDetail('planejado')}
                        className="text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
                <div className="mt-4 relative z-10">
                    <span className="bg-slate-50 text-slate-400 text-[8px] font-black px-2 py-1 rounded border border-slate-100 uppercase tracking-widest">Base: Itens de Processo</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between border-l-[10px] border-l-green-500 relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Executado (Contratado + Consumo)</p>
                        <h3 className="text-4xl font-black text-green-600 tracking-tighter">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalExecutado)}
                        </h3>
                    </div>
                    <button 
                        onClick={() => setCalculationDetail('executado')}
                        className="text-green-300 hover:text-green-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
                <div className="mt-4 w-full bg-slate-50 rounded-full h-2.5 overflow-hidden shadow-inner relative z-10 border border-slate-100">
                    <div 
                        className="bg-green-500 h-full transition-all duration-1000 rounded-full" 
                        style={{ width: `${totalEstimado > 0 ? Math.min(100, (totalExecutado / totalEstimado) * 100) : 0}%` }}
                    ></div>
                </div>
            </div>
        </div>

        <div className="md:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <svg className="w-24 h-24 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Alertas de Governança</p>
                <h3 className="text-4xl font-black text-red-600 tracking-tighter">{alerts.length}</h3>
            </div>
            <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest relative z-10">Ações Requeridas na Gestão Ativa</p>
        </div>
      </div>

      {/* ÁREA ENVOLVIDA - MELHORIA DE EXIBIÇÃO (FUNIL E RADAR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col">
              <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  Funil de Demandas Ativas
              </h3>
              <div className="space-y-10 flex-1 flex flex-col justify-center px-4">
                  {[
                      { label: '1. Planejamento Interno', val: funnelData.planejamento, color: 'bg-blue-500', width: '100%' },
                      { label: '2. Fase Externa (Licitação)', val: funnelData.licitacao, color: 'bg-indigo-500', width: '90%', margin: 'mx-auto' },
                      { label: '3. Execução / Gestão', val: funnelData.contratacao, color: 'bg-green-600', width: '80%', margin: 'mx-auto' }
                  ].map((item, i) => (
                      <div key={i} className={`w-full ${item.margin}`}>
                          <div className="flex justify-between items-end mb-2">
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                              <span className="text-sm font-black text-slate-900">{item.val} Ativos</span>
                          </div>
                          <div className="w-full bg-slate-50 rounded-2xl h-10 relative overflow-hidden shadow-inner border border-slate-100">
                              <div className={`${item.color} h-full absolute left-0 top-0 transition-all duration-1000 shadow-md`} style={{width: item.width}}></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-100 p-0 overflow-hidden flex flex-col min-h-[450px]">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-3 uppercase tracking-[0.2em]">
                    <svg