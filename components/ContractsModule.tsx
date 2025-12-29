
import React, { useState, useMemo } from 'react';
import { SituacaoContrato, MovimentoConsumo, AtaSrp, Contrato, ItemAta, Processo, ItemProcesso, HistoricoAditivo } from '../types';

interface ContractsModuleProps {
    processes: Processo[];
    processItems: ItemProcesso[]; 
    movements: MovimentoConsumo[];
    atas: AtaSrp[];
    onUpdateAtas: (atas: AtaSrp[]) => void;
    ataItems: ItemAta[]; 
    contratos: Contrato[];
    onUpdateContratos: (contratos: Contrato[]) => void;
}

type SortKeyAta = 'numeroAta' | 'fornecedor' | 'dataVencimento';
type SortKeyCtt = 'numeroContrato' | 'fornecedor' | 'dataFim' | 'valorGlobal';

export const ContractsModule: React.FC<ContractsModuleProps> = ({ 
    processes,
    processItems,
    movements, 
    atas, 
    onUpdateAtas,
    ataItems, 
    contratos, 
    onUpdateContratos 
}) => {
  const [activeTab, setActiveTab] = useState<'atas' | 'contratos'>('atas');
  const [selectedAtaId, setSelectedAtaId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const [sortAta, setSortAta] = useState<{ key: SortKeyAta; direction: 'asc' | 'desc' } | null>(null);
  const [sortCtt, setSortCtt] = useState<{ key: SortKeyCtt; direction: 'asc' | 'desc' } | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<'ATA' | 'CONTRATO' | null>(null);
  const [editingData, setEditingData] = useState<any>(null); 
  
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivingType, setArchivingType] = useState<'ATA' | 'CONTRATO' | null>(null);
  const [archivingData, setArchivingData] = useState<any>(null);

  const [extensionMonths, setExtensionMonths] = useState<number>(12);

  const activeAtas = useMemo(() => atas.filter(a => !a.arquivado), [atas]);
  const activeContratos = useMemo(() => contratos.filter(c => !c.arquivado), [contratos]);

  const selectedAta = activeAtas.find(a => a.id === selectedAtaId);
  const itemsAta = selectedAta ? ataItems.filter(item => item.ataId === selectedAta.id) : [];

  const selectedContract = activeContratos.find(c => c.id === selectedContractId);
  const itemsContract = selectedContract ? processItems.filter(item => item.processoSeiId === selectedContract.processoSeiId) : [];

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const parts = dateStr.split('-');
    if (parts.length !== 3) return 0;
    
    const expiry = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getValidityStatus = (dataVencimento: string) => {
    const diffDays = getDaysRemaining(dataVencimento);
    if (diffDays < 0) return { label: 'Vencida', color: 'bg-red-50 text-red-700 border-red-200' };
    if (diffDays === 0) return { label: 'Vence Hoje', color: 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse' };
    if (diffDays <= 90) return { label: `${diffDays} dias restantes`, color: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' };
    return { label: 'Vigente', color: 'bg-green-50 text-green-700 border-green-200' };
  };

  const sortedAtas = useMemo(() => {
      let result = [...activeAtas];
      if (sortAta) {
          result.sort((a, b) => {
              const valA = a[sortAta.key] || '';
              const valB = b[sortAta.key] || '';
              if (valA < valB) return sortAta.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortAta.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return result;
  }, [activeAtas, sortAta]);

  const sortedContratos = useMemo(() => {
      let result = [...activeContratos];
      if (sortCtt) {
          result.sort((a, b) => {
              const valA = a[sortCtt.key] || 0;
              const valB = b[sortCtt.key] || 0;
              if (valA < valB) return sortCtt.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortCtt.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return result;
  }, [activeContratos, sortCtt]);

  const handleSortAta = (key: SortKeyAta) => {
      setSortAta(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handleSortCtt = (key: SortKeyCtt) => {
      setSortCtt(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const getSortIcon = (currentKey: string, activeConfig: { key: string, direction: 'asc' | 'desc' } | null) => {
      if (activeConfig?.key !== currentKey) return <svg className="w-3 h-3 opacity-20 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
      return activeConfig.direction === 'asc' 
        ? <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        : <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const handleEditAta = (e: React.MouseEvent, ata: AtaSrp) => {
      e.stopPropagation();
      setEditingType('ATA');
      setEditingData({ 
          ...ata, 
          historicoAditivos: ata.historicoAditivos || [],
          termoAditivo: '', 
          processoSeiAditivo: '' 
      }); 
      setExtensionMonths(12);
      setIsEditModalOpen(true);
  };

  const handleEditContrato = (e: React.MouseEvent, contrato: Contrato) => {
      e.stopPropagation();
      setEditingType('CONTRATO');
      setEditingData({ 
          ...contrato, 
          historicoAditivos: contrato.historicoAditivos || [], 
          termoAditivo: '', 
          processoSeiAditivo: '' 
      });
      setExtensionMonths(12);
      setIsEditModalOpen(true);
  };

  const handleArchiveAta = (e: React.MouseEvent, ata: AtaSrp) => {
      e.stopPropagation();
      setArchivingType('ATA');
      setArchivingData(ata);
      setIsArchiveModalOpen(true);
  };

  const handleArchiveContrato = (e: React.MouseEvent, contrato: Contrato) => {
      e.stopPropagation();
      setArchivingType('CONTRATO');
      setArchivingData(contrato);
      setIsArchiveModalOpen(true);
  };

  const confirmArchive = () => {
      if (archivingType === 'ATA' && archivingData) {
          onUpdateAtas(atas.map(a => a.id === archivingData.id ? { ...a, arquivado: true } : a));
          if (selectedAtaId === archivingData.id) setSelectedAtaId(null);
      } else if (archivingType === 'CONTRATO' && archivingData) {
          onUpdateContratos(contratos.map(c => c.id === archivingData.id ? { ...c, arquivado: true } : c));
          if (selectedContractId === archivingData.id) setSelectedContractId(null);
      }
      setIsArchiveModalOpen(false);
      setArchivingData(null);
      setArchivingType(null);
  };

  const handleApplyExtension = () => {
      if (!editingData) return;
      if (!editingData.termoAditivo || !editingData.processoSeiAditivo) {
          alert('Informe a Referência do Termo e o Processo SEI antes de aplicar.');
          return;
      }

      const fieldName = editingType === 'ATA' ? 'dataVencimento' : 'dataFim';
      const currentExpiry = editingData[fieldName];
      
      if (!currentExpiry) {
          alert('Por favor, defina uma data base antes de aplicar o aditivo.');
          return;
      }

      const parts = currentExpiry.split('-');
      const expiryDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      
      const startDay = expiryDate.getDate();
      expiryDate.setMonth(expiryDate.getMonth() + extensionMonths);
      
      if (expiryDate.getDate() !== startDay) {
          expiryDate.setDate(0);
      }
      
      const newDateStr = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`;

      const novoHistorico: HistoricoAditivo = {
          termo: editingData.termoAditivo,
          processoSei: editingData.processoSeiAditivo,
          mesesAdicionados: extensionMonths,
          dataAlteracao: new Date().toISOString(),
          novoVencimento: newDateStr
      };

      const updatedHistory = [...(editingData.historicoAditivos || []), novoHistorico];

      setEditingData(prev => ({ 
          ...prev, 
          [fieldName]: newDateStr,
          historicoAditivos: updatedHistory,
          termoAditivo: '',
          processoSeiAditivo: ''
      }));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingData) return;

      if (editingType === 'ATA') {
          onUpdateAtas(atas.map(a => a.id === editingData.id ? editingData : a));
      } else if (editingType === 'CONTRATO') {
          onUpdateContratos(contratos.map(c => c.id === editingData.id ? editingData : c));
      }
      setIsEditModalOpen(false);
      setEditingData(null);
      setEditingType(null);
  };

  const getAvailableTerms = () => {
      const allTerms = Array.from({length: 12}, (_, i) => `${i + 1}º Termo Aditivo`);
      if (!editingData?.historicoAditivos) return allTerms;
      const usedTerms = new Set(editingData.historicoAditivos.map((h: HistoricoAditivo) => h.termo));
      return allTerms.filter(term => !usedTerms.has(term));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in relative">
      
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl w-fit shadow-inner">
        <button onClick={() => { setActiveTab('atas'); setSelectedAtaId(null); setSelectedContractId(null); }} className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'atas' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Atas SRP</button>
        <button onClick={() => { setActiveTab('contratos'); setSelectedAtaId(null); setSelectedContractId(null); }} className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'contratos' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Contratos</button>
      </div>

      {activeTab === 'atas' && (
        <>
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 transition-all duration-500 ${selectedAtaId ? 'h-[40%]' : 'h-full'}`}>
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Governança de Atas</h3>
                </div>
                <div className="overflow-auto h-full pb-24">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead className="bg-slate-50/80 text-slate-500 uppercase font-black sticky top-0 z-10 backdrop-blur-md border-b border-slate-200 text-[9px] tracking-[0.15em]">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSortAta('numeroAta')}>Nº Ata {getSortIcon('numeroAta', sortAta)}</th>
                                <th className="px-6 py-4">Processo</th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSortAta('fornecedor')}>Fornecedor {getSortIcon('fornecedor', sortAta)}</th>
                                <th className="px-6 py-4">Objeto</th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSortAta('dataVencimento')}>Vencimento {getSortIcon('dataVencimento', sortAta)}</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                                <th className="px-4 py-4 text-center w-12">Itens</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedAtas.map((ata) => (
                                <tr key={ata.id} onClick={() => setSelectedAtaId(selectedAtaId === ata.id ? null : ata.id)} className={`cursor-pointer transition-all ${selectedAtaId === ata.id ? 'bg-indigo-50/50 shadow-inner' : 'hover:bg-slate-50'}`}>
                                    <td className="px-6 py-5 font-black text-slate-900 font-mono text-[11px] tracking-tighter">{ata.numeroAta}</td>
                                    <td className="px-6 py-5 font-mono text-[10px] text-blue-600">{processes.find(p => p.id === ata.processoSeiId)?.numeroProcessoSei || 'N/A'}</td>
                                    <td className="px-6 py-5 text-[11px] font-extrabold text-slate-700">{ata.fornecedor}</td>
                                    <td className="px-6 py-5 truncate max-w-[200px] text-[11px] font-bold text-slate-700">{ata.objeto}</td>
                                    <td className="px-6 py-5"><span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${getValidityStatus(ata.dataVencimento).color}`}>{getValidityStatus(ata.dataVencimento).label}</span></td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={(e) => handleEditAta(e, ata)} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={(e) => handleArchiveAta(e, ata)} className="p-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center"><svg className={`w-5 h-5 mx-auto ${selectedAtaId === ata.id ? 'text-indigo-600' : 'text-slate-300'} transform transition-transform ${selectedAtaId === ata.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedAtaId && selectedAta && (
                <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col animate-slide-up z-20">
                    <div className="p-4 border-b border-indigo-50 bg-indigo-50/40 flex justify-between items-center">
                        <h3 className="font-black text-indigo-900 text-xs uppercase tracking-[0.2em]">Itens da Ata {selectedAta.numeroAta}</h3>
                        <button onClick={() => setSelectedAtaId(null)} className="text-slate-400 hover:text-red-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600 border-collapse">
                            <thead className="bg-slate-50/50 text-slate-400 uppercase font-black sticky top-0 text-[9px] tracking-[0.2em] border-b border-slate-100">
                                <tr><th className="px-6 py-4">Codificação</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4 text-right">Preço</th><th className="px-6 py-4 text-center">Registrado</th><th className="px-6 py-4 text-center">Saldo</th><th className="px-6 py-4">Consumo</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {itemsAta.map((item) => {
                                    const consumido = movements.filter(mov => mov.origemId === item.id && mov.status !== 'CANCELADO').reduce((acc, mov) => acc + mov.quantidadeConsumida, 0);
                                    const saldo = item.quantidadeRegistrada - consumido;
                                    const pct = item.quantidadeRegistrada > 0 ? (saldo / item.quantidadeRegistrada) * 100 : 0;
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 font-mono font-black text-xs text-indigo-700 tracking-tighter">{item.codigoItem}</td>
                                            <td className="px-6 py-4 font-bold text-[11px] text-slate-700">{item.descricao}</td>
                                            <td className="px-6 py-4 text-right font-mono text-[11px]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}</td>
                                            <td className="px-6 py-4 text-center font-black">{item.quantidadeRegistrada}</td>
                                            <td className="px-6 py-4 text-center font-black text-indigo-800 font-mono">{saldo}</td>
                                            <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="flex-1 bg-slate-100 rounded-full h-2 shadow-inner overflow-hidden"><div className={`h-full ${pct < 20 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div></div><span className="text-[9px] font-bold">{pct.toFixed(0)}%</span></div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      )}

      {activeTab === 'contratos' && (
        <>
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 transition-all duration-500 ${selectedContractId ? 'h-[40%]' : 'h-full'}`}>
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6" /></svg>Gestão de Contratos</h3>
                </div>
                <div className="overflow-auto h-full pb-24">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead className="bg-slate-50/80 text-slate-500 uppercase font-black sticky top-0 z-10 border-b border-slate-200 text-[9px] tracking-[0.15em]">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSortCtt('numeroContrato')}>Nº Contrato {getSortIcon('numeroContrato', sortCtt)}</th>
                                <th className="px-6 py-4">SEI</th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSortCtt('fornecedor')}>Fornecedor {getSortIcon('fornecedor', sortCtt)}</th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => handleSortCtt('dataFim')}>Fim Vigência {getSortIcon('dataFim', sortCtt)}</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Ação</th>
                                <th className="px-4 py-4 text-center w-12">Itens</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedContratos.map((ctt) => (
                                <tr key={ctt.id} onClick={() => setSelectedContractId(selectedContractId === ctt.id ? null : ctt.id)} className={`cursor-pointer transition-all ${selectedContractId === ctt.id ? 'bg-indigo-50/50 shadow-inner' : 'hover:bg-slate-50'}`}>
                                    <td className="px-6 py-5 font-black text-slate-900 font-mono text-[11px] tracking-tighter">{ctt.numeroContrato}</td>
                                    <td className="px-6 py-5 font-mono text-[10px] text-blue-600">{processes.find(p => p.id === ctt.processoSeiId)?.numeroProcessoSei || 'N/A'}</td>
                                    <td className="px-6 py-5 text-[11px] font-extrabold text-slate-700">{ctt.fornecedor}</td>
                                    <td className="px-6 py-5 font-black font-mono text-slate-800 text-[11px]">{new Date(ctt.dataFim).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-5 text-right font-mono font-black text-[11px] text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctt.valorGlobal)}</td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={(e) => handleEditContrato(e, ctt)} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={(e) => handleArchiveContrato(e, ctt)} className="p-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center"><svg className={`w-5 h-5 mx-auto ${selectedContractId === ctt.id ? 'text-indigo-600' : 'text-slate-300'} transform transition-transform ${selectedContractId === ctt.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedContractId && selectedContract && (
                <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col animate-slide-up z-20">
                    <div className="p-4 border-b border-indigo-50 bg-indigo-50/40 flex justify-between items-center">
                        <h3 className="font-black text-indigo-900 text-xs uppercase tracking-[0.2em]">Itens do Contrato {selectedContract.numeroContrato}</h3>
                        <button onClick={() => setSelectedContractId(null)} className="text-slate-400 hover:text-red-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600 border-collapse">
                            <thead className="bg-slate-50/50 text-slate-400 uppercase font-black sticky top-0 text-[9px] tracking-[0.2em] border-b border-slate-100">
                                <tr><th className="px-6 py-4">Codificação</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4 text-right">Unitário</th><th className="px-6 py-4 text-center">Qtd</th><th className="px-6 py-4 text-right">Subtotal</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {itemsContract.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 font-mono font-black text-xs text-blue-600 tracking-tighter">{item.codigoItem}</td>
                                        <td className="px-6 py-4 font-bold text-[11px] text-slate-700">{item.descricao}</td>
                                        <td className="px-6 py-4 text-right font-mono text-[11px]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitarioEstimado)}</td>
                                        <td className="px-6 py-4 text-center font-black">{item.quantidadeEstimada}</td>
                                        <td className="px-6 py-4 text-right font-black font-mono text-indigo-700 text-[11px]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidadeEstimada * item.valorUnitarioEstimado)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      )}

      {/* MODAL DE EDIÇÃO / ADITIVOS - ATUALIZADO PARA EXIBIR HISTÓRICO */}
      {isEditModalOpen && editingData && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 max-h-[95vh] overflow-y-auto">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                        <div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">{editingType === 'ATA' ? 'Ajustar Ata' : 'Ajustar Contrato'}</h3><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Governança Estratégica</p></div>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Identificador</label>
                            <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-mono font-black text-slate-700 bg-slate-50 shadow-inner focus:ring-2 focus:ring-indigo-100 outline-none text-xs" value={editingType === 'ATA' ? editingData.numeroAta : editingData.numeroContrato} onChange={(e) => setEditingData({...editingData, [editingType === 'ATA' ? 'numeroAta' : 'numeroContrato']: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Fornecedor</label>
                            <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-black text-slate-700 bg-slate-50 shadow-inner focus:ring-2 focus:ring-indigo-100 outline-none text-xs" value={editingData.fornecedor} onChange={(e) => setEditingData({...editingData, fornecedor: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Data Início</label>
                                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-black bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={editingType === 'ATA' ? editingData.dataAssinatura : editingData.dataInicio} onChange={(e) => setEditingData({...editingData, [editingType === 'ATA' ? 'dataAssinatura' : 'dataInicio']: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Data Vencimento</label>
                                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-black bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={editingType === 'ATA' ? editingData.dataVencimento : editingData.dataFim} onChange={(e) => setEditingData({...editingData, [editingType === 'ATA' ? 'dataVencimento' : 'dataFim']: e.target.value})} />
                            </div>
                        </div>

                        {/* SEÇÃO ADITIVO (RESTAURADA E MELHORADA CONFORME SCREENSHOT) */}
                        <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[8px] font-black text-red-500 uppercase mb-1.5 tracking-widest">Referência do Termo</label>
                                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-red-100" value={editingData.termoAditivo || ''} onChange={(e) => setEditingData({...editingData, termoAditivo: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {getAvailableTerms().map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-red-500 uppercase mb-1.5 tracking-widest">Processo SEI (Aditivo)</label>
                                    <input type="text" placeholder="Ex: SEI-24..." className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-red-100" value={editingData.processoSeiAditivo || ''} onChange={(e) => setEditingData({...editingData, processoSeiAditivo: e.target.value})} />
                                </div>
                            </div>

                            <div className="flex items-end gap-3">
                                <div className="w-1/3">
                                    <label className="block text-[8px] font-black text-red-700 uppercase mb-1.5 tracking-widest">Aditivo (Meses)</label>
                                    <input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-center font-black text-slate-700 bg-white shadow-inner outline-none focus:ring-2 focus:ring-red-100" value={extensionMonths} onChange={(e) => setExtensionMonths(Number(e.target.value))} />
                                </div>
                                <button type="button" onClick={handleApplyExtension} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100 active:scale-95 flex items-center justify-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                                    APLICAR
                                </button>
                                <div className="w-1/4 bg-red-50 border border-red-100 rounded-xl p-2 text-center shadow-sm min-w-[80px]">
                                    <span className="text-[7px] font-black text-red-400 block uppercase tracking-tighter">SALDO</span>
                                    <span className={`text-sm font-black font-mono leading-none ${getDaysRemaining(editingType === 'ATA' ? editingData.dataVencimento : editingData.dataFim) < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {getDaysRemaining(editingType === 'ATA' ? editingData.dataVencimento : editingData.dataFim)}d
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* LISTAGEM DO HISTÓRICO - VISIBILIDADE GARANTIDA */}
                        {editingData.historicoAditivos && editingData.historicoAditivos.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/30 -mx-6 px-6 pb-4">
                                <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Histórico de Alterações
                                </h5>
                                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                                    {editingData.historicoAditivos.map((hist: HistoricoAditivo, idx: number) => (
                                        <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 text-[10px] flex justify-between items-center shadow-sm transition-all hover:border-indigo-300">
                                            <div className="flex-1">
                                                <span className="font-black text-slate-800 block uppercase tracking-tight">{hist.termo}</span>
                                                <span className="font-mono text-[9px] text-indigo-500 font-bold">{hist.processoSei}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-green-600 block">+{hist.mesesAdicionados} Meses</span>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase">Expira: {new Date(hist.novoVencimento).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 flex justify-between gap-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all shadow-sm">DESCARTAR</button>
                        <button type="submit" className="px-10 py-3.5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all uppercase text-[10px] tracking-[0.15em] active:scale-95 flex items-center gap-3">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                             SALVAR AJUSTES
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isArchiveModalOpen && archivingData && (
        <div className="fixed inset-0 bg-slate-900/80 z-[120] flex items-center justify-center backdrop-blur-xl p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full text-center shadow-2xl border-b-[16px] border-amber-500">
                <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-100"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Arquivamento</h3>
                <p className="text-sm text-slate-500 mb-12 leading-relaxed font-semibold">O item <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{archivingType === 'ATA' ? archivingData.numeroAta : archivingData.numeroContrato}</span> será movido para a base histórica.</p>
                <div className="grid grid-cols-2 gap-5">
                    <button onClick={() => setIsArchiveModalOpen(false)} className="px-6 py-5 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Manter</button>
                    <button onClick={confirmArchive} className="px-6 py-5 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest active:scale-95">Arquivar</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
