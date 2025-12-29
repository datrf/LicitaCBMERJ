
import React, { useState, useMemo } from 'react';
import { LISTS } from '../constants';
import { IrpCabecalho, IrpItem, SituacaoIRP, TipoCodigo } from '../types';

interface IrpModuleProps {
    irps: IrpCabecalho[];
    onUpdateIrps: (irps: IrpCabecalho[]) => void;
    items: IrpItem[];
    onUpdateItems: (items: IrpItem[]) => void;
}

export const IrpModule: React.FC<IrpModuleProps> = ({ irps, onUpdateIrps, items: allIrpItems, onUpdateItems: setAllIrpItems }) => {
  const [selectedIrpId, setSelectedIrpId] = useState<string | null>(null);

  // --- SEARCH, FILTER & SORT STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof IrpCabecalho; direction: 'asc' | 'desc' } | null>(null);

  // Modal States
  const [isIrpModalOpen, setIsIrpModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingRedirectToItems, setPendingRedirectToItems] = useState(false);
  const [tempOutroProcesso, setTempOutroProcesso] = useState('');

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
      isOpen: boolean;
      type: 'IRP' | 'ITEM';
      id: string;
      title: string;
  }>({ isOpen: false, type: 'IRP', id: '', title: '' });

  // Filter out archived IRPs
  const activeIrps = useMemo(() => irps.filter(i => !i.arquivado), [irps]);

  const [newIrpData, setNewIrpData] = useState<Partial<IrpCabecalho>>({
    numeroIrp: '', objeto: '', origem: '', orgaoGerenciador: '', 
    situacao: SituacaoIRP.EM_ELABORACAO, dataAbertura: '', dataLimite: '',
    numeroProcessoSei: '', processoGerenciador: '', processoParticipante: '', outrosProcessos: []
  });

  const [editingIrpData, setEditingIrpData] = useState<IrpCabecalho | null>(null);
  const [newItemData, setNewItemData] = useState<Partial<IrpItem>>({
    codigoItem: '', tipoCodigo: TipoCodigo.CATMAT, descricao: '', unidade: 'UN', quantidade: 0, valorUnitario: 0
  });

  const selectedIrp = activeIrps.find(irp => irp.id === selectedIrpId);
  const items = selectedIrp ? allIrpItems.filter(item => item.irpId === selectedIrp.id) : [];
  const totalGeral = items.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);

  const filteredAndSortedIrps = useMemo(() => {
      let result = [...activeIrps];
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          result = result.filter(irp => irp.numeroIrp.toLowerCase().includes(lowerTerm) || irp.objeto.toLowerCase().includes(lowerTerm));
      }
      if (filterStatus) result = result.filter(irp => irp.situacao === filterStatus);
      if (sortConfig !== null) {
          result.sort((a, b) => {
              const valA = a[sortConfig.key];
              const valB = b[sortConfig.key];
              if (valA === undefined || valA === null) return 1;
              if (valB === undefined || valB === null) return -1;
              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return result;
  }, [activeIrps, searchTerm, filterStatus, sortConfig]);

  const requestSort = (key: keyof IrpCabecalho) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof IrpCabecalho) => {
      if (!sortConfig || sortConfig.key !== key) return <svg className="w-3 h-3 opacity-30 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
      return sortConfig.direction === 'asc' 
          ? <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          : <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const handleRequestDeleteIrp = (e: React.MouseEvent, irp: IrpCabecalho) => {
      e.stopPropagation();
      setDeleteConfirmation({ isOpen: true, type: 'IRP', id: irp.id, title: `IRP ${irp.numeroIrp}` });
  };

  const handleRequestDeleteItem = (e: React.MouseEvent, item: IrpItem) => {
      e.stopPropagation();
      setDeleteConfirmation({ isOpen: true, type: 'ITEM', id: item.id, title: `Item ${item.codigoItem} - ${item.descricao.substring(0, 20)}...` });
  };

  const handleConfirmDelete = () => {
      if (deleteConfirmation.type === 'IRP') {
          // Changed to Archive instead of Delete
          onUpdateIrps(irps.map(irp => irp.id === deleteConfirmation.id ? { ...irp, arquivado: true } : irp));
          if (selectedIrpId === deleteConfirmation.id) setSelectedIrpId(null);
      } else if (deleteConfirmation.type === 'ITEM') {
          setAllIrpItems(allIrpItems.filter(item => item.id !== deleteConfirmation.id));
      }
      setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
  };

  const handleAddOutroProcesso = (mode: 'CREATE' | 'EDIT') => {
      if (!tempOutroProcesso.trim()) return;
      if (mode === 'CREATE') setNewIrpData(prev => ({ ...prev, outrosProcessos: [...(prev.outrosProcessos || []), tempOutroProcesso] }));
      else if (mode === 'EDIT' && editingIrpData) setEditingIrpData(prev => prev ? ({ ...prev, outrosProcessos: [...(prev.outrosProcessos || []), tempOutroProcesso] }) : null);
      setTempOutroProcesso('');
  };

  const handleRemoveOutroProcesso = (index: number, mode: 'CREATE' | 'EDIT') => {
      if (mode === 'CREATE') {
          const updated = [...(newIrpData.outrosProcessos || [])];
          updated.splice(index, 1);
          setNewIrpData({...newIrpData, outrosProcessos: updated});
      } else if (mode === 'EDIT' && editingIrpData) {
          const updated = [...(editingIrpData.outrosProcessos || [])];
          updated.splice(index, 1);
          setEditingIrpData({...editingIrpData, outrosProcessos: updated});
      }
  };

  const handleOpenIrpModal = () => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    setNewIrpData({
      numeroIrp: '', objeto: '', origem: '', orgaoGerenciador: '', situacao: SituacaoIRP.EM_ELABORACAO,
      dataAbertura: today.toISOString().split('T')[0], dataLimite: nextMonth.toISOString().split('T')[0],
      numeroProcessoSei: '', processoGerenciador: '', processoParticipante: '', outrosProcessos: [],
      arquivado: false
    });
    setTempOutroProcesso('');
    setIsIrpModalOpen(true);
  };

  const handleRequestSave = (redirectToAddItems: boolean) => {
      setPendingRedirectToItems(redirectToAddItems);
      setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = () => {
    const newId = `irp-${Math.floor(Math.random() * 100000)}`; 
    const newIrpEntry: IrpCabecalho = {
        id: newId, numeroIrp: newIrpData.numeroIrp || '(Sem número)', origem: newIrpData.origem || '',
        orgaoGerenciador: newIrpData.orgaoGerenciador || 'Não informado', situacao: newIrpData.situacao || SituacaoIRP.EM_ELABORACAO,
        dataAbertura: newIrpData.dataAbertura || new Date().toISOString(), dataLimite: newIrpData.dataLimite || new Date().toISOString(),
        numeroProcessoSei: newIrpData.numeroProcessoSei || '', processoGerenciador: newIrpData.processoGerenciador || '',
        processoParticipante: newIrpData.processoParticipante || '', outrosProcessos: newIrpData.outrosProcessos || [], objeto: newIrpData.objeto || 'Objeto não informado',
        arquivado: false
    };
    onUpdateIrps([newIrpEntry, ...irps]);
    setSelectedIrpId(newId);
    setIsConfirmModalOpen(false);
    setIsIrpModalOpen(false);
    if (pendingRedirectToItems) {
        setNewItemData({ codigoItem: '', tipoCodigo: TipoCodigo.CATMAT, descricao: '', unidade: 'UN', quantidade: 1, valorUnitario: 0 });
        setTimeout(() => setIsItemModalOpen(true), 100); 
    }
  };

  const handleOpenEditModal = (e: React.MouseEvent, irp: IrpCabecalho) => {
    e.stopPropagation();
    setEditingIrpData({ ...irp, outrosProcessos: irp.outrosProcessos || [] });
    setTempOutroProcesso('');
    setIsEditModalOpen(true);
  };

  const handleUpdateIrp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIrpData) return;
    const updatedIrps = irps.map(irp => irp.id === editingIrpData.id ? editingIrpData : irp);
    onUpdateIrps(updatedIrps);
    setIsEditModalOpen(false);
    setEditingIrpData(null);
  };

  const handleOpenItemModal = () => {
    setNewItemData({
      codigoItem: '',
      tipoCodigo: TipoCodigo.CATMAT,
      descricao: '',
      unidade: 'UN',
      quantidade: 1,
      valorUnitario: 0
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (addAnother: boolean = false) => {
    if (!selectedIrpId) return;
    const newItemId = `item-${Math.floor(Math.random() * 100000)}`;
    const newItemEntry: IrpItem = {
        id: newItemId, irpId: selectedIrpId, codigoItem: newItemData.codigoItem || '00000',
        tipoCodigo: newItemData.tipoCodigo || TipoCodigo.CATMAT, descricao: newItemData.descricao || '',
        unidade: newItemData.unidade || 'UN', quantidade: Number(newItemData.quantidade), valorUnitario: Number(newItemData.valorUnitario)
    };
    setAllIrpItems([...allIrpItems, newItemEntry]);
    if (addAnother) setNewItemData({ ...newItemData, codigoItem: '', descricao: '', quantidade: 1, valorUnitario: 0 });
    else setIsItemModalOpen(false);
  };

  const getSituacaoColor = (situacao: SituacaoIRP) => {
    switch (situacao) {
        case SituacaoIRP.EM_ELABORACAO: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case SituacaoIRP.PUBLICADA: return 'bg-blue-100 text-blue-700 border-blue-200';
        case SituacaoIRP.CONCLUIDA: return 'bg-green-100 text-green-700 border-green-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in overflow-y-auto pb-6 relative">
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 transition-all duration-300 ${selectedIrpId ? 'h-96' : 'h-[550px]'}`}>
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Intenção de Registro de Preços
                <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-200 px-2 py-0.5 rounded-full">{filteredAndSortedIrps.length} registros</span>
            </h3>
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm transform active:scale-95" onClick={handleOpenIrpModal}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Nova IRP
            </button>
        </div>

        <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-1/3">
                <input type="text" placeholder="Buscar por Nº IRP ou Objeto..." className="pl-3 pr-3 py-1.5 w-full text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <select className="px-3 py-1.5 text-sm border border-slate-300 rounded-md" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Situação: Todas</option>
                    {Object.values(SituacaoIRP).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>

        <div className="overflow-auto h-full pb-12">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-slate-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('numeroIrp')}>Nº IRP {getSortIcon('numeroIrp')}</th>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('objeto')}>Objeto {getSortIcon('objeto')}</th>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('situacao')}>Situação {getSortIcon('situacao')}</th>
                        <th className="px-6 py-3">Origem</th>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('dataLimite')}>Data Limite {getSortIcon('dataLimite')}</th>
                        <th className="px-6 py-3">Proc. Participante</th>
                        <th className="px-6 py-3 text-center">Ações</th>
                        <th className="px-6 py-3 text-center">Detalhes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredAndSortedIrps.map((irp) => (
                        <tr key={irp.id} onClick={() => setSelectedIrpId(selectedIrpId === irp.id ? null : irp.id)} className={`cursor-pointer transition-colors hover:bg-slate-50 ${selectedIrpId === irp.id ? 'bg-blue-50' : ''}`}>
                            <td className="px-6 py-4 font-medium text-slate-900">{irp.numeroIrp}</td>
                            <td className="px-6 py-4 truncate max-w-xs" title={irp.objeto}>{irp.objeto}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSituacaoColor(irp.situacao)}`}>{irp.situacao}</span></td>
                            <td className="px-6 py-4 text-xs font-mono">{irp.origem}</td>
                            <td className="px-6 py-4">{new Date(irp.dataLimite).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 text-xs font-mono">{irp.processoParticipante || irp.numeroProcessoSei || '-'}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={(e) => handleOpenEditModal(e, irp)} className="p-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Editar IRP">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={(e) => handleRequestDeleteIrp(e, irp)} className="p-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" title="Arquivar IRP">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                    </button>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-blue-600 text-center"><svg className={`w-5 h-5 mx-auto transform transition-transform ${selectedIrpId === irp.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {selectedIrpId && selectedIrp && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-slide-up h-96 flex-shrink-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        IRP_ITENS
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-600 font-mono">Ref: {selectedIrp.numeroIrp}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-4"><span className="text-xs text-slate-500 block">Valor Total da IRP</span><span className="text-lg font-bold text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}</span></div>
                    <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm" onClick={handleOpenItemModal}><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Novo Item</button>
                    <button onClick={() => setSelectedIrpId(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors ml-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 text-slate-500 uppercase font-semibold sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Cód. Item</th>
                            <th className="px-6 py-3">Descrição</th>
                            <th className="px-6 py-3 w-24">Unidade</th>
                            <th className="px-6 py-3 w-24 text-right">Qtd</th>
                            <th className="px-6 py-3 w-32 text-right">Valor Unit.</th>
                            <th className="px-6 py-3 w-32 text-right">Total</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4"><div className="flex flex-col"><span className="font-bold text-slate-700 font-mono text-xs">{item.codigoItem}</span><span className="text-[10px] text-slate-400 uppercase tracking-wide">{item.tipoCodigo}</span></div></td>
                                <td className="px-6 py-4 font-medium">{item.descricao}</td>
                                <td className="px-6 py-4">{item.unidade}</td>
                                <td className="px-6 py-4 text-right font-mono">{item.quantidade}</td>
                                <td className="px-6 py-4 text-right font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.valorUnitario)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={(e) => handleRequestDeleteItem(e, item)} className="p-2 text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90" title="Excluir Item">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* MODALS REMAINDER UNCHANGED... */}
      {isIrpModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-slate-800">Nova IRP (Formulário AppSheet)</h3>
                    <button onClick={() => setIsIrpModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={(e) => {e.preventDefault(); handleRequestSave(false)}} className="p-6 space-y-4">
                    <div className="text-xs text-slate-400 mb-2 p-2 bg-slate-100 rounded border border-slate-200 font-mono">ID_IRP (Auto-generated): UNIQUEID()</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nº IRP <span className="text-slate-400 font-normal">(Opcional)</span></label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="ex: 010/2024" value={newIrpData.numeroIrp} onChange={(e) => setNewIrpData({...newIrpData, numeroIrp: e.target.value})} /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Processo Participante (CBMERJ)</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm" placeholder="SEI-..." value={newIrpData.processoParticipante} onChange={(e) => setNewIrpData({...newIrpData, processoParticipante: e.target.value})} /></div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dados do Órgão Gerenciador</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Nome Órgão / UASG</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ex: CBMERJ/DGAL ou UASG 925000" value={newIrpData.orgaoGerenciador} onChange={(e) => setNewIrpData({...newIrpData, orgaoGerenciador: e.target.value})} /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Proc. Gerenciador (Se Houver)</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm" placeholder="SEI (Externo) ou ID" value={newIrpData.processoGerenciador} onChange={(e) => setNewIrpData({...newIrpData, processoGerenciador: e.target.value})} /></div>
                        </div>
                    </div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Data Abertura <span className="text-red-500">*</span></label><input type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50" value={newIrpData.dataAbertura} onChange={(e) => setNewIrpData({...newIrpData, dataAbertura: e.target.value})} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Objeto da Licitação</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-24" placeholder="Descreva o objeto resumido..." value={newIrpData.objeto} onChange={(e) => setNewIrpData({...newIrpData, objeto: e.target.value})} /></div>
                    <div className="pt-4 flex justify-between gap-3"><button type="button" onClick={() => setIsIrpModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><div className="flex gap-2"><button type="button" onClick={() => handleRequestSave(false)} className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">Salvar e Sair</button><button type="button" onClick={() => handleRequestSave(true)} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">Salvar e Adicionar Itens →</button></div></div>
                </form>
            </div>
        </div>
      )}

      {isConfirmModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="bg-slate-50 p-6 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Confirmar Criação de IRP</h3></div>
                  <div className="p-6 space-y-4"><div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm"><div className="grid grid-cols-2 gap-y-3 gap-x-4"><div className="col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase">Objeto</span><span className="font-semibold text-slate-800">{newIrpData.objeto || 'Não informado'}</span></div><div><span className="block text-xs font-bold text-slate-400 uppercase">Nº IRP</span><span className="font-mono text-slate-700">{newIrpData.numeroIrp || '-'}</span></div><div><span className="block text-xs font-bold text-slate-400 uppercase">Abertura</span><span className="font-mono text-slate-700">{newIrpData.dataAbertura ? new Date(newIrpData.dataAbertura).toLocaleDateString('pt-BR') : '-'}</span></div></div></div></div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3"><button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">Voltar e Editar</button><button onClick={handleConfirmSave} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Confirmar Criação</button></div>
              </div>
          </div>
      )}

      {isEditModalOpen && editingIrpData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Editar IRP</h3><button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                <form onSubmit={handleUpdateIrp} className="p-6 space-y-4">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"><label className="block text-sm font-bold text-yellow-800 mb-1">Situação / Workflow</label><select className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none bg-white font-medium text-slate-700" value={editingIrpData.situacao} onChange={(e) => setEditingIrpData({...editingIrpData, situacao: e.target.value as SituacaoIRP})}>{Object.values(SituacaoIRP).map((status) => (<option key={status} value={status}>{status}</option>))}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nº IRP</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingIrpData.numeroIrp} onChange={(e) => setEditingIrpData({...editingIrpData, numeroIrp: e.target.value})} /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Proc. Participante</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm" value={editingIrpData.processoParticipante || editingIrpData.numeroProcessoSei} onChange={(e) => setEditingIrpData({...editingIrpData, processoParticipante: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Objeto</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-20" value={editingIrpData.objeto} onChange={(e) => setEditingIrpData({...editingIrpData, objeto: e.target.value})} /></div>
                    <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Salvar Alterações</button></div>
                </form>
            </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800">Novo Item da IRP</h3><button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                <form onSubmit={(e) => {e.preventDefault(); handleSaveItem(false)}} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Código</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newItemData.tipoCodigo} onChange={(e) => setNewItemData({...newItemData, tipoCodigo: e.target.value as TipoCodigo})}>{LISTS.TIPOS_CODIGO.map((tipo) => (<option key={tipo} value={tipo}>{tipo}</option>))}</select></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Código (CATMAT/SIGA)</label><input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono" placeholder="Ex: 45021" value={newItemData.codigoItem} onChange={(e) => setNewItemData({...newItemData, codigoItem: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Descrição Detalhada</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-20" placeholder="Descrição completa do item..." value={newItemData.descricao} onChange={(e) => setNewItemData({...newItemData, descricao: e.target.value})} required /></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Unidade</label><input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="UN, CX" value={newItemData.unidade} onChange={(e) => setNewItemData({...newItemData, unidade: e.target.value})} /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Qtd.</label><input type="number" required min="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newItemData.quantidade} onChange={(e) => setNewItemData({...newItemData, quantidade: Number(e.target.value)})} /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Vl. Unit.</label><input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newItemData.valorUnitario} onChange={(e) => setNewItemData({...newItemData, valorUnitario: Number(e.target.value)})} /></div>
                    </div>
                    <div className="pt-4 flex justify-between gap-3"><button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><div className="flex gap-2"><button type="button" onClick={() => handleSaveItem(true)} className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Salvar e Adicionar Outro</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Salvar e Sair</button></div></div>
                </form>
            </div>
        </div>
      )}
      
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
                <div className="flex items-center gap-3 mb-4 text-amber-600"><div className="bg-amber-100 p-2 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></div><h3 className="text-lg font-bold text-slate-800">Confirmar Arquivamento</h3></div>
                <p className="text-slate-600 mb-6">Deseja mover para o Arquivo Morto o item <strong>{deleteConfirmation.title}</strong>? <br/><br/><span className="text-xs text-slate-500 font-semibold">Ele poderá ser restaurado futuramente.</span></p>
                <div className="flex justify-end gap-3"><button onClick={() => setDeleteConfirmation({...deleteConfirmation, isOpen: false})} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><button onClick={handleConfirmDelete} className="px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm">Arquivar</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
