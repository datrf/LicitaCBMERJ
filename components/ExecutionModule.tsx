
import React, { useState, useMemo } from 'react';
import { LISTS } from '../constants';
import { TipoOrigem, MovimentoConsumo, UnidadeDemandante, AtaSrp, ItemAta, Processo } from '../types';

interface ExecutionModuleProps {
    processes: Processo[]; 
    movements: MovimentoConsumo[];
    onAddMovement: (movement: MovimentoConsumo) => void;
    onUpdateMovement: (movement: MovimentoConsumo) => void;
    atas: AtaSrp[];
    ataItems: ItemAta[];
}

type SortKey = 'unidadeDemandante' | 'descricao' | 'quantidadeConsumida' | 'faseExecucao' | 'processoSeiConsumo';

export const ExecutionModule: React.FC<ExecutionModuleProps> = ({ 
    processes, movements, onAddMovement, onUpdateMovement, atas, ataItems
}) => {
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [flowMovement, setFlowMovement] = useState<MovimentoConsumo | null>(null);
  const [editingMovement, setEditingMovement] = useState<MovimentoConsumo | null>(null);
  const [archivingMovement, setArchivingMovement] = useState<MovimentoConsumo | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const [newMovementData, setNewMovementData] = useState<Partial<MovimentoConsumo>>({
      unidadeDemandante: UnidadeDemandante.DGAL,
      quantidadeConsumida: 0,
      processoSeiConsumo: '',
      origemId: '',
      data: new Date().toISOString().split('T')[0],
      faseExecucao: 'PEDIDO'
  });
  const [selectedAtaIdForAdd, setSelectedAtaIdForAdd] = useState<string>('');

  const activeMovements = useMemo(() => movements.filter(m => !m.arquivado), [movements]);

  const filteredAndSortedMovements = useMemo(() => {
    let result = [...activeMovements].map(mov => {
        const itemRef = ataItems.find(i => i.id === mov.origemId);
        return { ...mov, descricao: itemRef?.descricao || '' };
    });

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(m => 
            m.unidadeDemandante.toLowerCase().includes(lowerTerm) ||
            m.descricao.toLowerCase().includes(lowerTerm) ||
            m.processoSeiConsumo?.toLowerCase().includes(lowerTerm)
        );
    }

    if (sortConfig) {
        result.sort((a, b) => {
            let valA: any = a[sortConfig.key as keyof typeof a] || '';
            let valB: any = b[sortConfig.key as keyof typeof b] || '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [activeMovements, searchTerm, sortConfig, ataItems]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return (
      <svg className="w-3 h-3 opacity-20 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
    );
    return sortConfig.direction === 'asc' 
      ? <svg className="w-3 h-3 ml-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-3 h-3 ml-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>;
  };

  const calculateDeliveryDate = (dateStr: string, days: number) => {
    if (!dateStr || !days) return "";
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const getLogisticsBadgeData = (mov: MovimentoConsumo) => {
      if (mov.faseExecucao === 'ENTREGUE') return { label: 'PEDIDO ENTREGUE', style: 'bg-green-50 text-green-700 border-green-200', days: 0 };
      if (mov.faseExecucao === 'EMPENHO') {
          if (!mov.previsaoEntrega) return { label: 'NOTA DE EMPENHO (AGUARDANDO PRAZO)', style: 'bg-amber-50 text-amber-700 border-amber-200', days: null };
          const today = new Date(); today.setHours(0,0,0,0);
          const previsao = new Date(mov.previsaoEntrega); previsao.setHours(0,0,0,0);
          const diff = Math.ceil((previsao.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0) return { label: 'ATRASADO (PÓS-EMPENHO)', style: 'bg-red-50 text-red-700 border-red-200 animate-pulse', days: Math.abs(diff) };
          return { label: 'NOTA DE EMPENHO (EM PRAZO)', style: 'bg-blue-50 text-blue-700 border-blue-200', days: diff };
      }
      switch (mov.faseExecucao) {
          case 'ASSINADO': return { label: 'CONTRATO ASSINADO', style: 'bg-indigo-50 text-indigo-700 border-indigo-200', days: null };
          case 'CONTRATO': return { label: 'CONTRATO', style: 'bg-slate-100 text-slate-700 border-slate-300', days: null };
          case 'PEDIDO': 
          default: return { label: 'PEDIDO REALIZADO', style: 'bg-slate-50 text-slate-400 border-slate-200', days: null };
      }
  };

  const handleSaveNewMovement = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMovementData.origemId || !newMovementData.quantidadeConsumida) return;
      const movement: MovimentoConsumo = {
          id: `mov-${Math.floor(Math.random() * 100000)}`,
          tipoOrigem: TipoOrigem.ATA,
          origemId: newMovementData.origemId!,
          quantidadeConsumida: newMovementData.quantidadeConsumida!,
          data: newMovementData.data || new Date().toISOString().split('T')[0],
          unidadeDemandante: newMovementData.unidadeDemandante as UnidadeDemandante,
          processoSeiConsumo: newMovementData.processoSeiConsumo,
          faseExecucao: 'PEDIDO',
          arquivado: false
      };
      onAddMovement(movement);
      setIsAddModalOpen(false);
      setNewMovementData({ unidadeDemandante: UnidadeDemandante.DGAL, quantidadeConsumida: 0, processoSeiConsumo: '', origemId: '', data: new Date().toISOString().split('T')[0], faseExecucao: 'PEDIDO' });
      setSelectedAtaIdForAdd('');
  };

  const handleUpdateFlow = (e: React.FormEvent) => {
      e.preventDefault();
      if (flowMovement) {
          const finalMovement = { ...flowMovement };
          // Remove temporary field 'descricao' before saving to keep state clean
          delete (finalMovement as any).descricao;
          if (finalMovement.faseExecucao === 'EMPENHO' && finalMovement.dataEmpenho && finalMovement.prazoEntregaDias) {
              finalMovement.previsaoEntrega = calculateDeliveryDate(finalMovement.dataEmpenho, finalMovement.prazoEntregaDias);
          }
          onUpdateMovement(finalMovement);
          setIsFlowModalOpen(false);
          setFlowMovement(null);
      }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMovement) {
        const finalMovement = { ...editingMovement };
        // Remove temporary field 'descricao' before saving
        delete (finalMovement as any).descricao;
        onUpdateMovement(finalMovement);
        setIsEditModalOpen(false);
        setEditingMovement(null);
    }
  };

  const confirmArchive = () => {
      if (archivingMovement) {
          const finalMovement = { ...archivingMovement, arquivado: true };
          delete (finalMovement as any).descricao;
          onUpdateMovement(finalMovement);
          setIsArchiveModalOpen(false);
          setArchivingMovement(null);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in relative">
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Monitoramento Logístico de Consumo
            </h3>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                    <input 
                        type="text" 
                        placeholder="Buscar por unidade, item ou processo..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>
                 <button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95 shadow-[0_8px_25px_-5px_rgba(37,99,235,0.5)] flex items-center gap-2"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    + Novo Consumo
                 </button>
            </div>
        </div>
        
        <div className="overflow-auto h-full pb-24">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-black sticky top-0 z-10 backdrop-blur-md border-b border-slate-200 text-[9px] tracking-[0.15em]">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('unidadeDemandante')}>
                            <div className="flex items-center">Unidade {getSortIcon('unidadeDemandante')}</div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('processoSeiConsumo')}>
                            <div className="flex items-center">Processo SEI {getSortIcon('processoSeiConsumo')}</div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('descricao')}>
                            <div className="flex items-center">Item Solicitado {getSortIcon('descricao')}</div>
                        </th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('quantidadeConsumida')}>
                            <div className="flex items-center justify-center">Qtd {getSortIcon('quantidadeConsumida')}</div>
                        </th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('faseExecucao')}>
                            <div className="flex items-center justify-center">Fase / Status Logístico {getSortIcon('faseExecucao')}</div>
                        </th>
                        <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAndSortedMovements.map((mov) => {
                        const logBadge = getLogisticsBadgeData(mov);
                        return (
                            <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">{mov.unidadeDemandante}</td>
                                <td className="px-6 py-5 font-mono text-[11px] font-bold text-indigo-600">{mov.processoSeiConsumo || 'Pendente'}</td>
                                <td className="px-6 py-5 truncate max-w-[240px] text-[11px] font-bold text-slate-700" title={mov.descricao}>{mov.descricao}</td>
                                <td className="px-6 py-5 text-center font-black text-indigo-800 font-mono text-base">{mov.quantidadeConsumida}</td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className={`px-4 py-2 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm bg-slate-50 text-slate-400 border-slate-200`}>
                                            {logBadge.label}
                                        </span>
                                        {logBadge.days !== null && mov.faseExecucao !== 'ENTREGUE' && (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-black font-mono shadow-sm">{logBadge.days} DIAS {logBadge.label.includes('ATRASADO') ? 'EM ATRASO' : 'RESTANTES'}</div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex gap-3 justify-center">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setFlowMovement({ ...mov }); setIsFlowModalOpen(true); }} 
                                            className="p-2.5 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90" 
                                            title="Movimentar Fase"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingMovement({ ...mov }); setIsEditModalOpen(true); }} 
                                            className="p-2.5 text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-[0_4px_15px_rgba(59,130,246,0.3)] active:scale-90" 
                                            title="Editar Informações"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setArchivingMovement(mov); setIsArchiveModalOpen(true); }} 
                                            className="p-2.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" 
                                            title="Arquivar"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL: NOVO CONSUMO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all border border-slate-100">
                <div className="bg-indigo-600 p-8 border-b border-indigo-700 flex justify-between items-center text-white">
                    <div className="flex items-center gap-5">
                        <div className="bg-white/20 p-4 rounded-2xl shadow-xl">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Novo Registro de Consumo</h3>
                            <p className="text-[10px] text-indigo-100 font-mono font-black uppercase tracking-widest mt-2">Ata SRP vinculada</p>
                        </div>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-white/60 hover:text-white transition-colors"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSaveNewMovement} className="p-10 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ata de Registro de Preços</label>
                            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={selectedAtaIdForAdd} onChange={e => { setSelectedAtaIdForAdd(e.target.value); setNewMovementData({...newMovementData, origemId: ''}); }}>
                                <option value="">Selecione a Ata...</option>
                                {atas.filter(a => !a.arquivado).map(a => <option key={a.id} value={a.id}>{a.numeroAta} - {a.fornecedor}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Item da Ata</label>
                            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={newMovementData.origemId} onChange={e => setNewMovementData({...newMovementData, origemId: e.target.value})} disabled={!selectedAtaIdForAdd}>
                                <option value="">Selecione o Item...</option>
                                {ataItems.filter(i => i.ataId === selectedAtaIdForAdd).map(i => {
                                    const consumido = movements.filter(m => m.origemId === i.id && m.status !== 'CANCELADO').reduce((acc, m) => acc + m.quantidadeConsumida, 0);
                                    const saldo = i.quantidadeRegistrada - consumido;
                                    return <option key={i.id} value={i.id}>{i.descricao} (Saldo: {saldo})</option>;
                                })}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nº Processo SEI Pedido</label>
                            <input type="text" required placeholder="SEI-240001/..." className="w-full border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={newMovementData.processoSeiConsumo || ''} onChange={e => setNewMovementData({...newMovementData, processoSeiConsumo: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Unidade Demandante</label>
                            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={newMovementData.unidadeDemandante} onChange={e => setNewMovementData({...newMovementData, unidadeDemandante: e.target.value as UnidadeDemandante})}>
                                {LISTS.UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Quantidade Requisitada</label>
                        <input type="number" required min="1" className="w-full border border-slate-200 rounded-xl px-4 py-3 font-mono font-black text-2xl text-indigo-700 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={newMovementData.quantidadeConsumida} onChange={e => setNewMovementData({...newMovementData, quantidadeConsumida: Number(e.target.value)})} />
                    </div>
                    <div className="pt-6 flex justify-end gap-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-8 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest transition-all">Cancelar</button>
                        <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-[0.15em] active:scale-95">Registrar Consumo</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO DE CONSUMO */}
      {isEditModalOpen && editingMovement && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 transform transition-all scale-100">
                <div className="bg-blue-600 p-8 border-b border-blue-700 flex justify-between items-center text-white">
                    <div className="flex items-center gap-5">
                        <div className="bg-white/20 p-4 rounded-2xl shadow-xl">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Editar Consumo</h3>
                            <p className="text-[10px] text-blue-100 font-mono font-black uppercase tracking-widest mt-2">ID: {editingMovement.id}</p>
                        </div>
                    </div>
                    <button onClick={() => { setIsEditModalOpen(false); setEditingMovement(null); }} className="text-white/60 hover:text-white transition-colors"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSaveEdit} className="p-10 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nº SEI do Pedido</label>
                            <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={editingMovement.processoSeiConsumo || ''} onChange={e => setEditingMovement({...editingMovement, processoSeiConsumo: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Unidade</label>
                            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={editingMovement.unidadeDemandante} onChange={e => setEditingMovement({...editingMovement, unidadeDemandante: e.target.value as UnidadeDemandante})}>
                                {LISTS.UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Quantidade Consumida</label>
                        <input type="number" min="1" className="w-full border border-slate-200 rounded-xl px-4 py-3 font-mono font-black text-2xl text-blue-700 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={editingMovement.quantidadeConsumida} onChange={e => setEditingMovement({...editingMovement, quantidadeConsumida: Number(e.target.value)})} />
                    </div>
                    <div className="pt-6 flex justify-end gap-4 border-t border-slate-100">
                        <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingMovement(null); }} className="px-8 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest transition-all">Cancelar</button>
                        <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-[0.15em] active:scale-95">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {isFlowModalOpen && flowMovement && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-10 border-l-[12px] border-indigo-600 overflow-hidden transform transition-all border border-slate-100">
                <div className="flex items-center gap-5 mb-8">
                    <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600 shadow-xl shadow-indigo-50">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-tight leading-none">Fluxo de Execução</h3>
                        <p className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-widest mt-2">Pedido: {flowMovement.processoSeiConsumo}</p>
                    </div>
                </div>
                <form onSubmit={handleUpdateFlow} className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Etapa Atual</label>
                        <select className="w-full border border-slate-200 rounded-2xl px-6 py-4 bg-slate-50 font-black text-indigo-900 shadow-inner focus:ring-4 focus:ring-indigo-100 outline-none transition-all" value={flowMovement.faseExecucao || 'PEDIDO'} onChange={e => setFlowMovement({...flowMovement, faseExecucao: e.target.value as any})}>
                            <option value="PEDIDO">1. Pedido Realizado</option>
                            <option value="CONTRATO">2. Contrato</option>
                            <option value="ASSINADO">3. Contrato Assinado</option>
                            <option value="EMPENHO">4. Nota de Empenho</option>
                            <option value="ENTREGUE">5. Pedido Entregue</option>
                        </select>
                    </div>
                    {flowMovement.faseExecucao === 'EMPENHO' && (
                        <div className="p-6 bg-amber-50/50 border-2 border-amber-100 rounded-3xl space-y-6 shadow-sm animate-slide-up">
                            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Prazos de Entrega</h4>
                            <div className="grid grid-cols-1 gap-6">
                                <div><label className="block text-[9px] font-black text-amber-600 uppercase mb-2">Data da Nota de Empenho</label><input type="date" required className="w-full p-4 border border-amber-200 rounded-2xl font-black bg-white focus:ring-4 focus:ring-amber-100 outline-none transition-all" value={flowMovement.dataEmpenho || ''} onChange={e => { const newDate = e.target.value; const newPrev = calculateDeliveryDate(newDate, flowMovement.prazoEntregaDias || 0); setFlowMovement({...flowMovement, dataEmpenho: newDate, previsaoEntrega: newPrev}); }} /></div>
                                <div><label className="block text-[9px] font-black text-amber-600 uppercase mb-2">Prazo Contratual (em dias)</label><input type="number" required min="1" className="w-full p-4 border border-amber-200 rounded-2xl font-black bg-white focus:ring-4 focus:ring-amber-100 outline-none transition-all" value={flowMovement.prazoEntregaDias || 0} onChange={e => { const newDays = Number(e.target.value); const newPrev = calculateDeliveryDate(flowMovement.dataEmpenho || "", newDays); setFlowMovement({...flowMovement, prazoEntregaDias: newDays, previsaoEntrega: newPrev}); }} /></div>
                                {flowMovement.previsaoEntrega && <div className="bg-white/50 p-3 rounded-xl border border-amber-200 text-center"><p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Previsão Calculada</p><p className="text-sm font-black text-amber-900 font-mono">{new Date(flowMovement.previsaoEntrega).toLocaleDateString('pt-BR')}</p></div>}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-100"><button type="button" onClick={() => {setIsFlowModalOpen(false); setFlowMovement(null);}} className="px-8 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest transition-all">Cancelar</button><button type="submit" className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.15em] active:scale-95">Salvar Avanço</button></div>
                </form>
            </div>
        </div>
      )}

      {isArchiveModalOpen && archivingMovement && (
        <div className="fixed inset-0 bg-slate-900/80 z-[120] flex items-center justify-center backdrop-blur-xl p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full text-center shadow-2xl border-b-[16px] border-amber-500">
                <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-100"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Mover para Arquivo</h3>
                <p className="text-sm text-slate-500 mb-12 leading-relaxed font-semibold">O pedido <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{(archivingMovement as any).processoSeiConsumo}</span> sairá do monitoramento ativo.</p>
                <div className="grid grid-cols-2 gap-5"><button onClick={() => {setIsArchiveModalOpen(false); setArchivingMovement(null);}} className="px-6 py-5 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button><button onClick={confirmArchive} className="px-6 py-5 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest active:scale-95">Arquivar</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
