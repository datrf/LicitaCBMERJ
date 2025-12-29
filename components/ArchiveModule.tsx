
import React, { useMemo, useState } from 'react';
import { Processo, StatusProcesso, MovimentoConsumo, ItemAta, AtaSrp, Contrato, ItemProcesso, IrpCabecalho, IrpItem } from '../types';

interface ArchiveModuleProps {
    processes: Processo[];
    onUpdateProcess: (processes: Processo[]) => void;
    movements: MovimentoConsumo[];
    onUpdateMovement: (movement: MovimentoConsumo) => void;
    ataItems: ItemAta[];
    atas: AtaSrp[];
    onUpdateAtas: (atas: AtaSrp[]) => void;
    contratos: Contrato[];
    onUpdateContratos: (contratos: Contrato[]) => void;
    items: ItemProcesso[]; 
    irps: IrpCabecalho[];
    onUpdateIrps: (irps: IrpCabecalho[]) => void;
    irpItems: IrpItem[];
}

type ArchiveType = 'PROCESS' | 'MOVEMENT' | 'ATA' | 'CONTRATO' | 'IRP';

export const ArchiveModule: React.FC<ArchiveModuleProps> = ({ 
    processes, 
    onUpdateProcess, 
    movements, 
    onUpdateMovement,
    ataItems,
    atas,
    onUpdateAtas,
    contratos,
    onUpdateContratos,
    items = [],
    irps,
    onUpdateIrps,
    irpItems
}) => {
  const [activeTab, setActiveTab] = useState<'processes' | 'irps' | 'atas' | 'contratos' | 'consumptions'>('processes');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  
  // --- ESTADOS DE FILTROS POR COLUNA ---
  const [filterId, setFilterId] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterObjeto, setFilterObjeto] = useState('');

  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; type: ArchiveType; data: any }>({ isOpen: false, type: 'PROCESS', data: null });
  const [restoreConfirmation, setRestoreConfirmation] = useState<{ isOpen: boolean; type: ArchiveType; data: any }>({ isOpen: false, type: 'PROCESS', data: null });

  // --- HELPERS DE DADOS ---
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    processes.forEach(p => p.anoPlanejamento && years.add(p.anoPlanejamento));
    irps.forEach(i => years.add(new Date(i.dataAbertura).getFullYear()));
    atas.forEach(a => years.add(new Date(a.dataAssinatura).getFullYear()));
    contratos.forEach(c => years.add(new Date(c.dataInicio).getFullYear()));
    movements.forEach(m => years.add(new Date(m.data).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [processes, irps, atas, contratos, movements]);

  const getProcessValue = (procId: string) => items.filter(i => i.processoSeiId === procId).reduce((acc, i) => acc + (i.quantidadeEstimada * (i.valorUnitario || i.valorUnitarioEstimado)), 0);
  const getIrpValue = (irpId: string) => irpItems.filter(i => i.irpId === irpId).reduce((acc, i) => acc + (i.quantidade * i.valorUnitario), 0);
  const getAtaValue = (ataId: string) => ataItems.filter(i => i.ataId === ataId).reduce((acc, i) => acc + (i.quantidadeRegistrada * i.valorUnitario), 0);
  const getMovementValue = (mov: MovimentoConsumo) => {
      const item = ataItems.find(i => i.id === mov.origemId);
      return item ? mov.quantidadeConsumida * item.valorUnitario : 0;
  };

  const getClassification = (procId?: string) => {
      if (!procId) return "NÃO CLASSIFICADO";
      return processes.find(p => p.id === procId)?.classificacao || "ADMINISTRATIVO";
  };

  // --- LÓGICA DE FILTRAGEM UNIFICADA ---
  const applyFilters = (data: any[], idField: string, objField: string, statusField: string, classProvider: (item: any) => string, yearProvider: (item: any) => number) => {
      return data.filter(item => {
          const matchesYear = selectedYear === 'all' || yearProvider(item) === selectedYear;
          const matchesId = !filterId || item[idField]?.toLowerCase().includes(filterId.toLowerCase());
          const matchesObj = !filterObjeto || item[objField]?.toLowerCase().includes(filterObjeto.toLowerCase());
          const matchesStatus = !filterStatus || item[statusField]?.toLowerCase().includes(filterStatus.toLowerCase());
          const matchesClass = !filterClass || classProvider(item).toLowerCase().includes(filterClass.toLowerCase());
          return matchesYear && matchesId && matchesObj && matchesStatus && matchesClass;
      });
  };

  const filteredData = useMemo(() => {
      switch(activeTab) {
          case 'processes': 
            return applyFilters(processes.filter(p => p.status === StatusProcesso.ARQUIVADO), 'numeroProcessoSei', 'objeto', 'status', (i) => i.classificacao, (i) => i.anoPlanejamento);
          case 'irps': 
            return applyFilters(irps.filter(i => i.arquivado), 'numeroIrp', 'objeto', 'situacao', () => 'PLANEJAMENTO IRP', (i) => new Date(i.dataAbertura).getFullYear());
          case 'atas': 
            return applyFilters(atas.filter(a => a.arquivado), 'numeroAta', 'objeto', 'situacao', (i) => getClassification(i.processoSeiId), (i) => new Date(i.dataAssinatura).getFullYear());
          case 'contratos': 
            return applyFilters(contratos.filter(c => c.arquivado), 'numeroContrato', 'objeto', 'situacao', (i) => getClassification(i.processoSeiId), (i) => new Date(i.dataInicio).getFullYear());
          case 'consumptions': 
            return applyFilters(movements.filter(m => m.arquivado), 'processoSeiConsumo', 'unidadeDemandante', 'faseExecucao', (m) => {
                const item = ataItems.find(i => i.id === m.origemId);
                const ata = atas.find(a => a.id === item?.ataId);
                return getClassification(ata?.processoSeiId);
            }, (i) => new Date(i.data).getFullYear());
          default: return [];
      }
  }, [activeTab, selectedYear, filterId, filterClass, filterStatus, filterObjeto, processes, irps, atas, contratos, movements, ataItems]);

  const handleConfirmRestore = () => {
    const { type, data } = restoreConfirmation;
    if (type === 'PROCESS' && data) onUpdateProcess(processes.map(p => p.id === data.id ? { ...p, status: StatusProcesso.CONCLUIDO } : p));
    else if (type === 'MOVEMENT' && data) onUpdateMovement({ ...data, arquivado: false });
    else if (type === 'ATA' && data) onUpdateAtas(atas.map(a => a.id === data.id ? { ...a, arquivado: false } : a));
    else if (type === 'CONTRATO' && data) onUpdateContratos(contratos.map(c => c.id === data.id ? { ...c, arquivado: false } : c));
    else if (type === 'IRP' && data) onUpdateIrps(irps.map(i => i.id === data.id ? { ...i, arquivado: false } : i));
    setRestoreConfirmation({ isOpen: false, type: 'PROCESS', data: null });
  };

  const renderDossierContent = () => {
      if (!detailsModal.data) return null;
      const data = detailsModal.data;
      return (
          <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 grid grid-cols-2 gap-4">
                  <div><span className="text-[10px] font-black text-slate-400 uppercase block">Identificador</span><span className="font-bold text-slate-800">{data.numeroProcessoSei || data.numeroIrp || data.numeroAta || data.numeroContrato || data.processoSeiConsumo}</span></div>
                  <div><span className="text-[10px] font-black text-slate-400 uppercase block">Situação Final</span><span className="font-bold text-slate-800">{data.status || data.situacao || data.faseExecucao}</span></div>
                  <div className="col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase block">Objeto</span><span className="font-bold text-slate-800">{data.objeto || data.unidadeDemandante}</span></div>
              </div>
              <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-400 text-xs italic">Informações detalhadas do dossiê histórico carregadas com sucesso.</p>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in">
        <div className="flex justify-between items-center gap-4">
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl w-fit overflow-x-auto shadow-inner">
                {['processes', 'irps', 'atas', 'contratos', 'consumptions'].map(t => (
                    <button key={t} onClick={() => { setActiveTab(t as any); setFilterId(''); setFilterClass(''); setFilterStatus(''); setFilterObjeto(''); }} className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                        {t === 'processes' ? 'Processos' : t === 'irps' ? 'IRP' : t === 'atas' ? 'Atas SRP' : t === 'contratos' ? 'Contratos' : 'Consumos'}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Exercício:</span>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-slate-100 border-none text-slate-700 text-xs font-bold rounded px-3 py-1 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                    <option value="all">Ver Tudo</option>
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm border-collapse table-fixed">
                    <thead className="bg-slate-50 sticky top-0 z-20 border-b shadow-sm">
                        <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-6 py-4 w-1/5">Nº Identificador</th>
                            <th className="px-6 py-4 w-1/5">Classificação</th>
                            <th className="px-6 py-4 w-1/4">Objeto da Demanda</th>
                            <th className="px-6 py-4 w-1/5">Status / Situação</th>
                            <th className="px-6 py-4 w-1/6 text-right">Valor Total</th>
                            <th className="px-6 py-4 w-24 text-center">Ações</th>
                        </tr>
                        {/* LINHA DE FILTROS POR COLUNA */}
                        <tr className="bg-slate-100/50">
                            <td className="px-4 py-2"><input type="text" placeholder="Filtrar Nº..." className="w-full px-2 py-1 text-[10px] border rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filterId} onChange={e => setFilterId(e.target.value)} /></td>
                            <td className="px-4 py-2"><input type="text" placeholder="Filtrar Classe..." className="w-full px-2 py-1 text-[10px] border rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filterClass} onChange={e => setFilterClass(e.target.value)} /></td>
                            <td className="px-4 py-2"><input type="text" placeholder="Filtrar Objeto..." className="w-full px-2 py-1 text-[10px] border rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filterObjeto} onChange={e => setFilterObjeto(e.target.value)} /></td>
                            <td className="px-4 py-2"><input type="text" placeholder="Filtrar Status..." className="w-full px-2 py-1 text-[10px] border rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} /></td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 text-center"><button onClick={() => {setFilterId(''); setFilterClass(''); setFilterStatus(''); setFilterObjeto('');}} className="text-[8px] font-black text-indigo-600 hover:underline">LIMPAR</button></td>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((item: any) => {
                            let valor = 0;
                            let classe = "";
                            let id = item.numeroProcessoSei || item.numeroIrp || item.numeroAta || item.numeroContrato || item.processoSeiConsumo;
                            let objeto = item.objeto || item.unidadeDemandante;
                            let status = item.status || item.situacao || item.faseExecucao;

                            if (activeTab === 'processes') { valor = getProcessValue(item.id); classe = item.classificacao; }
                            else if (activeTab === 'irps') { valor = getIrpValue(item.id); classe = "PLANEJAMENTO IRP"; }
                            else if (activeTab === 'atas') { valor = getAtaValue(item.id); classe = getClassification(item.processoSeiId); }
                            else if (activeTab === 'contratos') { valor = item.valorGlobal; classe = getClassification(item.processoSeiId); }
                            else if (activeTab === 'consumptions') { 
                                valor = getMovementValue(item);
                                const iAta = ataItems.find(i => i.id === item.origemId);
                                const a = atas.find(at => at.id === iAta?.ataId);
                                classe = getClassification(a?.processoSeiId);
                            }

                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-[10px] truncate">{id}</td>
                                    <td className="px-6 py-4 font-black text-slate-400 uppercase text-[9px] tracking-tighter truncate">{classe}</td>
                                    <td className="px-6 py-4 truncate font-bold text-slate-700 uppercase text-[10px]">{objeto}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest border border-slate-200 truncate inline-block max-w-full">{status}</span></td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 text-[10px] whitespace-nowrap">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}</td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <button onClick={() => setDetailsModal({ isOpen: true, type: activeTab === 'processes' ? 'PROCESS' : activeTab === 'irps' ? 'IRP' : activeTab === 'atas' ? 'ATA' : activeTab === 'contratos' ? 'CONTRATO' : 'MOVEMENT', data: item })} className="p-1.5 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-600 hover:text-white"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>
                                        <button onClick={() => setRestoreConfirmation({ isOpen: true, type: activeTab === 'processes' ? 'PROCESS' : activeTab === 'irps' ? 'IRP' : activeTab === 'atas' ? 'ATA' : activeTab === 'contratos' ? 'CONTRATO' : 'MOVEMENT', data: item })} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-600 hover:text-white"><svg className="w-3.5 h-3.5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredData.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.4em]">Nenhum registro localizado com os filtros aplicados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL DETALHES */}
        {detailsModal.isOpen && (
            <div className="fixed inset-0 bg-slate-900/70 z-[130] flex items-center justify-center backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl transition-all duration-500 overflow-hidden flex flex-col border border-white/20 max-w-2xl w-full">
                    <div className="bg-indigo-700 p-6 flex justify-between items-center text-white shrink-0">
                        <h3 className="text-xl font-black uppercase tracking-tight">Prontuário Histórico</h3>
                        <button onClick={() => setDetailsModal({ ...detailsModal, isOpen: false })} className="text-white/40 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="p-8 bg-white flex-1">{renderDossierContent()}</div>
                    <div className="p-6 border-t bg-slate-50 flex justify-end gap-4">
                        <button onClick={() => setDetailsModal({ ...detailsModal, isOpen: false })} className="px-8 py-3 text-[10px] font-black uppercase text-slate-400">Fechar</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL RESTAURAÇÃO */}
        {restoreConfirmation.isOpen && (
            <div className="fixed inset-0 bg-slate-900/80 z-[140] flex items-center justify-center backdrop-blur-xl p-4 animate-fade-in">
                <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-[12px] border-indigo-600">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></div>
                    <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Reativar Registro?</h3>
                    <p className="text-[10px] text-slate-500 mb-8 uppercase font-bold tracking-widest">O item retornará ao fluxo de monitoramento ativo.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setRestoreConfirmation({ ...restoreConfirmation, isOpen: false })} className="py-4 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400">Manter</button>
                        <button onClick={handleConfirmRestore} className="py-4 bg-indigo-600 text-white font-black rounded-2xl text-[9px] font-black uppercase tracking-widest">Sim, Reativar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
