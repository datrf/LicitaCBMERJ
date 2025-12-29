
import React, { useState, useMemo } from 'react';
import { LISTS } from '../constants';
import { StatusProcesso, Processo, ItemProcesso, Modalidade, UnidadeDemandante, TipoCodigo, ClassificacaoProcesso, Contrato, SituacaoContrato, AtaSrp, ItemAta, IrpItem, IrpCabecalho } from '../types';

interface BiddingModuleProps {
    processes: Processo[];
    onUpdateProcesses: (processes: Processo[]) => void;
    items: ItemProcesso[];
    onUpdateItems: (items: ItemProcesso[]) => void;
    irps: IrpCabecalho[]; 
    irpItems: IrpItem[];
    atas: AtaSrp[];
    onUpdateAtas: (atas: AtaSrp[]) => void;
    ataItems: ItemAta[];
    onUpdateAtaItems: (items: ItemAta[]) => void;
    contratos: Contrato[];
    onUpdateContratos: (contratos: Contrato[]) => void;
}

export const BiddingModule: React.FC<BiddingModuleProps> = ({ 
    processes, onUpdateProcesses, items: allProcessItems, onUpdateItems: setAllProcessItems, irps, irpItems,
    atas, onUpdateAtas, ataItems, onUpdateAtaItems, contratos, onUpdateContratos
}) => {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterModalidade, setFilterModalidade] = useState<string>('');
  const [filterClassificacao, setFilterClassificacao] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Processo | 'idle' | 'items'; direction: 'asc' | 'desc' } | null>(null);

  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState(false);
  const [isEditProcessModalOpen, setIsEditProcessModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'INFO' | 'FLOW'>('INFO');
  const [isDateConfirmOpen, setIsDateConfirmOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

  // Estados para Homologação
  const [isHomologationConfirmModalOpen, setIsHomologationConfirmModalOpen] = useState(false);
  const [isHomologationValuesModalOpen, setIsHomologationValuesModalOpen] = useState(false);
  const [homologationValues, setHomologationValues] = useState<Record<string, number>>({});

  const [irpImportSelection, setIrpImportSelection] = useState<Record<string, { selected: boolean; quantity: number }>>({});

  const [archiveConfirmation, setArchiveConfirmation] = useState<{
      isOpen: boolean;
      process: Processo | null;
  }>({ isOpen: false, process: null });

  const [isContractGenModalOpen, setIsContractGenModalOpen] = useState(false);
  const [contractGenData, setContractGenData] = useState<{
      numeroContrato: string;
      fornecedor: string;
      dataInicio: string;
      dataFim: string;
      selectedItems: Record<string, boolean>;
  }>({
      numeroContrato: '',
      fornecedor: '',
      dataInicio: '',
      dataFim: '',
      selectedItems: {}
  });

  const [isAtaQuantityModalOpen, setIsAtaQuantityModalOpen] = useState(false);
  const [ataQuantityToGenerate, setAtaQuantityToGenerate] = useState(1);
  const [currentAtaIndex, setCurrentAtaIndex] = useState(1);
  const [editingAtaId, setEditingAtaId] = useState<string | null>(null);

  const [isAtaGenModalOpen, setIsAtaGenModalOpen] = useState(false);
  const [ataGenData, setAtaGenData] = useState<{
      numeroAta: string;
      fornecedor: string;
      dataAssinatura: string;
      dataVencimento: string;
      prorrogacao: boolean;
      selectedItems: Record<string, boolean>;
  }>({
      numeroAta: '',
      fornecedor: '',
      dataAssinatura: '',
      dataVencimento: '',
      prorrogacao: false,
      selectedItems: {}
  });

  const [tempRelatedProcess, setTempRelatedProcess] = useState('');
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
      isOpen: boolean;
      type: 'PROCESS' | 'ITEM' | 'ATA';
      id: string;
      title: string;
  }>({ isOpen: false, type: 'PROCESS', id: '', title: '' });
  
  const [newProcessData, setNewProcessData] = useState<Partial<Processo>>({
    numeroProcessoSei: '',
    processosRelacionados: [],
    numeroPregao: '',
    objeto: '',
    modalidade: Modalidade.PREGAO_ELETRONICO,
    classificacao: ClassificacaoProcesso.ADMINISTRATIVO,
    status: StatusProcesso.DOD,
    setorRequisitante: UnidadeDemandante.DGAL,
    dataInicio: '',
    ano: new Date().getFullYear(),
    anoPlanejamento: new Date().getFullYear(),
    origemIrpId: '',
    qtdParticipantesExternos: 0
  });

  const [editingProcessData, setEditingProcessData] = useState<Processo | null>(null);
  const [editingItemData, setEditingItemData] = useState<ItemProcesso | null>(null);

  const [newItemData, setNewItemData] = useState<any>({
    codigoItem: '',
    tipoCodigo: TipoCodigo.CATMAT,
    descricao: '',
    unidade: 'UN',
    quantidadeEstimada: 1,
    valorUnitarioEstimado: 0,
    valorUnitario: 0
  });

  const selectedProcess = processes.find(p => p.id === selectedProcessId);
  const items = selectedProcess ? allProcessItems.filter(item => item.processoSeiId === selectedProcess.id) : [];

  const calculateIdleTime = (lastUpdate: string) => {
    if (!lastUpdate) return 0;
    const last = new Date(lastUpdate).getTime();
    const now = new Date().getTime();
    const diffTime = now - last;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const filteredAndSortedProcesses = useMemo(() => {
      let result = processes.filter(p => p.status !== StatusProcesso.ARQUIVADO);
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          result = result.filter(p => 
              p.numeroProcessoSei.toLowerCase().includes(lowerTerm) ||
              p.objeto.toLowerCase().includes(lowerTerm)
          );
      }
      if (filterStatus) result = result.filter(p => p.status === filterStatus);
      if (filterModalidade) result = result.filter(p => p.modalidade === filterModalidade);
      if (filterClassificacao) result = result.filter(p => p.classificacao === filterClassificacao);

      if (sortConfig !== null) {
          result.sort((a, b) => {
              if (sortConfig.key === 'idle') {
                  const idleA = calculateIdleTime(a.dataUltimaMovimentacao);
                  const idleB = calculateIdleTime(b.dataUltimaMovimentacao);
                  return sortConfig.direction === 'asc' ? idleA - idleB : idleB - idleA;
              }
              const valA = a[sortConfig.key as keyof Processo];
              const valB = b[sortConfig.key as keyof Processo];
              if (valA === undefined || valA === null) return 1;
              if (valB === undefined || valB === null) return -1;
              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return result;
  }, [processes, searchTerm, filterStatus, filterModalidade, filterClassificacao, sortConfig]);

  const requestSort = (key: keyof Processo | 'idle') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Processo | 'idle') => {
      if (!sortConfig || sortConfig.key !== key) {
          return <svg className="w-3 h-3 opacity-20 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
      }
      return sortConfig.direction === 'asc' 
          ? <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          : <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const getExistingAtaForItem = (procId: string, itemCode: string, excludeAtaId?: string | null): string | null => {
      const relatedAtas = atas.filter(a => a.processoSeiId === procId);
      for (const ata of relatedAtas) {
          if (excludeAtaId && ata.id === excludeAtaId) continue;
          const hasItem = ataItems.some(i => i.ataId === ata.id && i.codigoItem === itemCode);
          if (hasItem) return ata.numeroAta;
      }
      return null;
  };

  const handleSelectAllAvailableItems = (isChecked: boolean) => {
      if (!editingProcessData) return;
      const processItems = allProcessItems.filter(i => i.processoSeiId === editingProcessData.id);
      const newSelection = { ...ataGenData.selectedItems };
      processItems.forEach(item => {
          const existingAtaNumber = getExistingAtaForItem(editingProcessData.id, item.codigoItem, editingAtaId);
          if (!existingAtaNumber) {
              newSelection[item.id] = isChecked;
          }
      });
      setAtaGenData({ ...ataGenData, selectedItems: newSelection });
  };

  const getStatusColor = (status: StatusProcesso) => {
     if (status.includes('APONTAM') || status.includes('CHECK')) return 'bg-red-100 text-red-700 border-red-200';
     if (status.includes('CONTRATO') || status.includes('ATA') || status.includes('CONCLUÍDO') || status.includes('ENTREGUE')) return 'bg-green-100 text-green-700 border-green-200';
     if (status.includes('PRAZO DE ENTREGA')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
     return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const handleIrpChange = (irpId: string) => {
      setNewProcessData({ ...newProcessData, origemIrpId: irpId });
      if (!irpId) {
          setIrpImportSelection({});
          return;
      }
      const itemsToImport = irpItems.filter(i => i.irpId === irpId);
      const initialSelection: Record<string, { selected: boolean; quantity: number }> = {};
      itemsToImport.forEach(item => {
          initialSelection[item.id] = { selected: true, quantity: item.quantidade };
      });
      setIrpImportSelection(initialSelection);
  };

  const handleToggleIrpItem = (itemId: string) => {
      setIrpImportSelection(prev => ({
          ...prev,
          [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected }
      }));
  };

  const handleChangeIrpItemQty = (itemId: string, newQty: number) => {
      setIrpImportSelection(prev => ({
          ...prev,
          [itemId]: { ...prev[itemId], quantity: newQty }
      }));
  };

  const handleArchiveProcess = (e: React.MouseEvent, proc: Processo) => {
      e.stopPropagation();
      setArchiveConfirmation({ isOpen: true, process: proc });
  };

  const handleConfirmArchive = () => {
      if (!archiveConfirmation.process) return;
      const updatedProcesses = processes.map(p => 
          p.id === archiveConfirmation.process!.id ? { ...p, status: StatusProcesso.ARQUIVADO } : p
      );
      onUpdateProcesses(updatedProcesses);
      if (selectedProcessId === archiveConfirmation.process.id) setSelectedProcessId(null);
      setArchiveConfirmation({ isOpen: false, process: null });
  };

  const handleRequestDeleteProcess = (e: React.MouseEvent, proc: Processo) => {
      e.stopPropagation();
      setDeleteConfirmation({ isOpen: true, type: 'PROCESS', id: proc.id, title: `Processo ${proc.numeroProcessoSei}` });
  };
  const handleRequestDeleteItem = (e: React.MouseEvent, item: ItemProcesso) => {
      e.stopPropagation();
      setDeleteConfirmation({ isOpen: true, type: 'ITEM', id: item.id, title: `Item ${item.codigoItem}` });
  };
  const handleConfirmDelete = () => {
      if (deleteConfirmation.type === 'PROCESS') {
          onUpdateProcesses(processes.filter(p => p.id !== deleteConfirmation.id));
          if (selectedProcessId === deleteConfirmation.id) setSelectedProcessId(null);
      } else if (deleteConfirmation.type === 'ITEM') {
          setAllProcessItems(allProcessItems.filter(item => item.id !== deleteConfirmation.id));
      }
      setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
  };

  const handleAddRelatedProcess = (e: React.MouseEvent, mode: 'CREATE' | 'EDIT') => {
      e.preventDefault();
      if (!tempRelatedProcess.trim()) return;
      if (mode === 'CREATE') {
          setNewProcessData({ ...newProcessData, processosRelacionados: [...(newProcessData.processosRelacionados || []), tempRelatedProcess] });
      } else if (mode === 'EDIT' && editingProcessData) {
          setEditingProcessData({ ...editingProcessData, processosRelacionados: [...(editingProcessData.processosRelacionados || []), tempRelatedProcess] });
      }
      setTempRelatedProcess('');
  };
  const handleRemoveRelatedProcess = (index: number, mode: 'CREATE' | 'EDIT') => {
      if (mode === 'CREATE') {
          const updated = [...(newProcessData.processosRelacionados || [])];
          updated.splice(index, 1);
          setNewProcessData({ ...newProcessData, processosRelacionados: updated });
      } else if (mode === 'EDIT' && editingProcessData) {
          const updated = [...(editingProcessData.processosRelacionados || [])];
          updated.splice(index, 1);
          setEditingProcessData({ ...editingProcessData, processosRelacionados: updated });
      }
  };

  const handleOpenNewProcessModal = () => {
    setNewProcessData({
        numeroProcessoSei: '', processosRelacionados: [], numeroPregao: '', objeto: '',
        modalidade: Modalidade.PREGAO_ELETRONICO, classificacao: ClassificacaoProcesso.ADMINISTRATIVO,
        status: StatusProcesso.DOD, setorRequisitante: UnidadeDemandante.DGAL,
        dataInicio: new Date().toISOString().split('T')[0], ano: new Date().getFullYear(),
        anoPlanejamento: new Date().getFullYear(), origemIrpId: '', qtdParticipantesExternos: 0
    });
    setTempRelatedProcess('');
    setIrpImportSelection({});
    setIsNewProcessModalOpen(true);
  };

  const handleSaveProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `SEI-${new Date().getFullYear()}/${Math.floor(Math.random() * 100000)}/${new Date().getFullYear()}`; 
    const displaySei = newProcessData.numeroProcessoSei || `(Pendente) ${newId}`;
    const newProcessEntry: Processo = {
        id: newId, numeroProcessoSei: displaySei, processosRelacionados: newProcessData.processosRelacionados || [],
        numeroPregao: newProcessData.numeroPregao, objeto: newProcessData.objeto || 'Objeto não informado',
        modalidade: newProcessData.modalidade || Modalidade.PREGAO_ELETRONICO, classificacao: newProcessData.classificacao || ClassificacaoProcesso.ADMINISTRATIVO,
        status: newProcessData.status || StatusProcesso.DOD, setorRequisitante: newProcessData.setorRequisitante || UnidadeDemandante.DGAL,
        ano: newProcessData.ano || new Date().getFullYear(), anoPlanejamento: newProcessData.anoPlanejamento || new Date().getFullYear(),
        dataInicio: newProcessData.dataInicio || new Date().toISOString(), dataUltimaMovimentacao: new Date().toISOString(),
        origemIrpId: newProcessData.origemIrpId, qtdParticipantesExternos: newProcessData.qtdParticipantesExternos || 0
    };
    onUpdateProcesses([newProcessEntry, ...processes]);
    
    if (newProcessData.origemIrpId) {
        const irpItemsToImport = irpItems.filter(i => i.irpId === newProcessData.origemIrpId);
        const selectedItems = irpItemsToImport.filter(item => irpImportSelection[item.id]?.selected);
        if (selectedItems.length > 0) {
            const importedItems: ItemProcesso[] = selectedItems.map((irpItem, index) => ({
                id: `item-proc-${newId}-${index}`, 
                processoSeiId: newId, 
                numeroItem: index + 1,
                codigoItem: irpItem.codigoItem, 
                tipoCodigo: irpItem.tipoCodigo, 
                descricao: irpItem.descricao,
                quantidadeEstimada: irpImportSelection[irpItem.id]?.quantity || irpItem.quantidade, 
                valorUnitarioEstimado: irpItem.valorUnitario, 
                origemIrpItemId: irpItem.id
            }));
            setAllProcessItems([...allProcessItems, ...importedItems]);
            if (!newProcessData.objeto) {
                const linkedIrp = irps.find(i => i.id === newProcessData.origemIrpId);
                if (linkedIrp) {
                   newProcessEntry.objeto = linkedIrp.objeto;
                   onUpdateProcesses(processes.map(p => p.id === newId ? {...p, objeto: linkedIrp.objeto} : p));
                }
            }
        }
    }
    setSelectedProcessId(newId);
    setIsNewProcessModalOpen(false);
  };

  const handleOpenEditInfo = (e: React.MouseEvent, proc: Processo) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProcessData({...proc, processosRelacionados: proc.processosRelacionados || []});
    setTempRelatedProcess('');
    setEditMode('INFO'); 
    setIsEditProcessModalOpen(true);
  };

  const handleOpenMove = (e: React.MouseEvent, proc: Processo) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProcessData({...proc, processosRelacionados: proc.processosRelacionados || []});
    setTempRelatedProcess('');
    setEditMode('FLOW'); 
    setIsEditProcessModalOpen(true);
  };

  const handleSetToday = () => {
    setIsDateConfirmOpen(true);
  };

  const confirmSetToday = () => {
    setEditingProcessData(prev => prev ? ({ ...prev, dataUltimaMovimentacao: new Date().toISOString() }) : null);
    setIsDateConfirmOpen(false);
  };

  const openAtaQuantityModal = () => {
      setAtaQuantityToGenerate(1);
      setEditingAtaId(null);
      setIsAtaQuantityModalOpen(true);
  };

  const startAtaGenerationLoop = () => {
      setIsAtaQuantityModalOpen(false);
      setCurrentAtaIndex(1);
      if (editingProcessData) prepareAtaModal(editingProcessData.id);
  };

  const prepareAtaModal = (procId: string) => {
      const processItems = allProcessItems.filter(i => i.processoSeiId === procId);
      const initialSelectedItems: Record<string, boolean> = {};
      processItems.forEach(item => { initialSelectedItems[item.id] = false; });
      setAtaGenData({
          numeroAta: '', fornecedor: '',
          dataAssinatura: new Date().toISOString().split('T')[0],
          dataVencimento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          prorrogacao: false, selectedItems: initialSelectedItems
      });
      setEditingAtaId(null);
      setIsAtaGenModalOpen(true);
  };

  const handleUpdateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProcessData) return;
    const originalProcess = processes.find(p => p.id === editingProcessData.id);
    let updatedData = { ...editingProcessData };
    
    if (originalProcess && editingProcessData.numeroProcessoSei !== originalProcess.numeroProcessoSei) {
        const historyEntry = `${originalProcess.numeroProcessoSei} (Alterado em ${new Date().toLocaleDateString('pt-BR')})`;
        updatedData.historicoNumeros = [...(originalProcess.historicoNumeros || []), historyEntry];
    }

    // INTERCEPÇÃO PARA HOMOLOGAÇÃO
    if (originalProcess && updatedData.status === StatusProcesso.HOMOLOGACAO && originalProcess.status !== StatusProcesso.HOMOLOGACAO) {
        setIsEditProcessModalOpen(false);
        setIsHomologationConfirmModalOpen(true);
        return;
    }

    if (originalProcess && updatedData.status === StatusProcesso.CONTRATO && originalProcess.status !== StatusProcesso.CONTRATO) {
        const processItems = allProcessItems.filter(i => i.processoSeiId === updatedData.id);
        const initialSelectedItems: Record<string, boolean> = {};
        processItems.forEach(item => initialSelectedItems[item.id] = true);
        setContractGenData({
            numeroContrato: '', fornecedor: '',
            dataInicio: new Date().toISOString().split('T')[0],
            dataFim: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            selectedItems: initialSelectedItems
        });
        onUpdateProcesses(processes.map(p => p.id === updatedData.id ? updatedData : p));
        setIsEditProcessModalOpen(false);
        setIsContractGenModalOpen(true);
        return; 
    }

    if (originalProcess && updatedData.status === StatusProcesso.ATA_RP && originalProcess.status !== StatusProcesso.ATA_RP) {
        onUpdateProcesses(processes.map(p => p.id === updatedData.id ? updatedData : p));
        setIsEditProcessModalOpen(false);
        openAtaQuantityModal();
        return;
    }

    onUpdateProcesses(processes.map(p => p.id === updatedData.id ? updatedData : p));
    setIsEditProcessModalOpen(false);
    setEditingProcessData(null);
  };

  // Funções de Homologação
  const handleStartHomologationValues = () => {
    if (!editingProcessData) return;
    const processItems = allProcessItems.filter(i => i.processoSeiId === editingProcessData.id);
    const initialVals: Record<string, number> = {};
    processItems.forEach(item => {
        initialVals[item.id] = item.valorUnitario || item.valorUnitarioEstimado;
    });
    setHomologationValues(initialVals);
    setIsHomologationConfirmModalOpen(false);
    setIsHomologationValuesModalOpen(true);
  };

  const handleFinishHomologation = (saveValues: boolean) => {
    if (!editingProcessData) return;
    
    if (saveValues) {
        const updatedProcessItems = allProcessItems.map(i => {
            if (i.processoSeiId === editingProcessData.id && homologationValues[i.id] !== undefined) {
                return { ...i, valorUnitario: homologationValues[i.id] };
            }
            return i;
        });
        setAllProcessItems(updatedProcessItems);
    }

    onUpdateProcesses(processes.map(p => p.id === editingProcessData.id ? { ...editingProcessData, status: StatusProcesso.HOMOLOGACAO } : p));
    setIsHomologationConfirmModalOpen(false);
    setIsHomologationValuesModalOpen(false);
    setEditingProcessData(null);
  };

  const handleGenerateContract = () => {
      if (!editingProcessData) return;
      const processItems = allProcessItems.filter(i => i.processoSeiId === editingProcessData.id);
      const contractValue = processItems.reduce((acc, item) => {
          if (contractGenData.selectedItems[item.id]) {
              const unitVal = item.valorUnitario || item.valorUnitarioEstimado;
              return acc + (item.quantidadeEstimada * unitVal);
          }
          return acc;
      }, 0);
      const newContract: Contrato = {
          id: `ctt-auto-${Math.floor(Math.random() * 10000)}`, processoSeiId: editingProcessData.id,
          numeroContrato: contractGenData.numeroContrato || 'S/N', fornecedor: contractGenData.fornecedor || 'Fornecedor Pendente',
          dataInicio: contractGenData.dataInicio, dataFim: contractGenData.dataFim,
          valorGlobal: contractValue, situacao: SituacaoContrato.VIGENTE, objeto: editingProcessData.objeto
      };
      onUpdateContratos([...contratos, newContract]);
      setIsContractGenModalOpen(false);
      setEditingProcessData(null);
      alert(`Contrato ${newContract.numeroContrato} gerado com sucesso!`);
  };

  const handleSaveAta = (forceFinish: boolean = false) => {
      if (!editingProcessData) return;
      const isEditMode = !!editingAtaId;
      const targetAtaId = isEditMode ? editingAtaId! : `ata-auto-${Math.floor(Math.random() * 10000)}`;
      const ataData: AtaSrp = {
          id: targetAtaId, processoSeiId: editingProcessData.id, numeroAta: ataGenData.numeroAta,
          fornecedor: ataGenData.fornecedor, dataAssinatura: ataGenData.dataAssinatura,
          dataVencimento: ataGenData.dataVencimento, prorrogacao: ataGenData.prorrogacao,
          situacao: SituacaoContrato.VIGENTE, objeto: editingProcessData.objeto
      };
      const processItems = allProcessItems.filter(i => i.processoSeiId === editingProcessData.id);
      const newItensAta: ItemAta[] = [];
      processItems.forEach(item => {
          if (ataGenData.selectedItems[item.id]) {
              const existingAta = getExistingAtaForItem(editingProcessData!.id, item.codigoItem, targetAtaId);
              if (existingAta) return; 
              newItensAta.push({
                  id: `item-ata-${targetAtaId}-${item.numeroItem}`, ataId: targetAtaId,
                  codigoItem: item.codigoItem, tipoCodigo: item.tipoCodigo, descricao: item.descricao,
                  quantidadeRegistrada: item.quantidadeEstimada, quantidadeConsumida: 0,
                  valorUnitario: item.valorUnitario || item.valorUnitarioEstimado
              });
          }
      });
      if (newItensAta.length === 0) { alert("Selecione ao menos um item válido para compor a Ata."); return; }
      if (isEditMode) {
          onUpdateAtas(atas.map(a => a.id === targetAtaId ? ataData : a));
          onUpdateAtaItems([...ataItems.filter(i => i.ataId !== targetAtaId), ...newItensAta]);
      } else {
          onUpdateAtas([...atas, ataData]);
          onUpdateAtaItems([...ataItems, ...newItensAta]);
      }
      if (isEditMode) { alert(`Ata ${ataData.numeroAta} atualizada!`); setIsAtaGenModalOpen(false); }
      else {
          if (!forceFinish && currentAtaIndex < ataQuantityToGenerate) {
              alert(`Ata ${currentAtaIndex} de ${ataQuantityToGenerate} gerada! Preparando próxima...`);
              setCurrentAtaIndex(prev => prev + 1);
              prepareAtaModal(editingProcessData.id); 
          } else {
              setIsAtaGenModalOpen(false);
              setEditingProcessData(null); 
              alert(forceFinish ? `Concluído! ${currentAtaIndex} Ata(s) gerada(s).` : `Concluído! ${ataQuantityToGenerate} Ata(s) gerada(s).`);
          }
      }
  };

  const handleOpenItemModal = () => {
    setNewItemData({ codigoItem: '', tipoCodigo: TipoCodigo.CATMAT, descricao: '', unidade: 'UN', quantidadeEstimada: 1, valorUnitarioEstimado: 0, valorUnitario: 0 });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (addAnother: boolean = false) => {
    if (!selectedProcessId) return;
    const currentItemsCount = items.length;
    const newItemEntry: ItemProcesso = {
        id: `item-proc-manual-${Math.random()}`, 
        processoSeiId: selectedProcessId, 
        numeroItem: currentItemsCount + 1,
        codigoItem: newItemData.codigoItem || '00000', 
        tipoCodigo: newItemData.tipoCodigo || TipoCodigo.CATMAT,
        descricao: newItemData.descricao || '', 
        quantidadeEstimada: Number(newItemData.quantidadeEstimada),
        valorUnitarioEstimado: Number(newItemData.valorUnitarioEstimado),
        valorUnitario: newItemData.valorUnitario ? Number(newItemData.valorUnitario) : undefined,
        origemIrpItemId: undefined 
    };
    setAllProcessItems([...allProcessItems, newItemEntry]);
    if (addAnother) setNewItemData({ ...newItemData, codigoItem: '', descricao: '', quantidadeEstimada: 1, valorUnitarioEstimado: 0, valorUnitario: 0 });
    else setIsItemModalOpen(false);
  };

  const handleOpenEditItem = (e: React.MouseEvent, item: ItemProcesso) => {
      e.stopPropagation();
      setEditingItemData({ ...item });
      setIsEditItemModalOpen(true);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItemData) return;

      const originalItem = allProcessItems.find(i => i.id === editingItemData.id);
      if (!originalItem) return;

      const updatedProcessItems = allProcessItems.map(i => i.id === editingItemData.id ? editingItemData : i);
      setAllProcessItems(updatedProcessItems);

      const updatedAtaItems = ataItems.map(ai => {
          const parentAta = atas.find(a => a.id === ai.ataId);
          if (parentAta && parentAta.processoSeiId === editingItemData.processoSeiId && ai.codigoItem === originalItem.codigoItem) {
              return {
                  ...ai,
                  codigoItem: editingItemData.codigoItem,
                  descricao: editingItemData.descricao,
                  valorUnitario: editingItemData.valorUnitario || editingItemData.valorUnitarioEstimado,
              };
          }
          return ai;
      });
      onUpdateAtaItems(updatedAtaItems);

      setIsEditItemModalOpen(false);
      setEditingItemData(null);
  };

  const isSRP = newProcessData.modalidade === Modalidade.PREGAO_SRP || newProcessData.modalidade === Modalidade.ADESAO_ARP;

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in overflow-y-auto pb-6 relative">
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 transition-all duration-300 ${selectedProcessId ? 'h-96' : 'h-[550px]'}`}>
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 012-2h11a2 2 0 012 2v16a2 2 0 01-2 2H3a2 2 0 01-2-2zm10-5v-6m0 0l3 3m-3-3l-3 3" /></svg>
                PROCESSOS LICITATÓRIOS
                <span className="text-[10px] font-normal text-slate-500 ml-2 bg-slate-200 px-2 py-0.5 rounded-full">{filteredAndSortedProcesses.length} registros</span>
            </h3>
            <div className="flex gap-2 items-center">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm" onClick={handleOpenNewProcessModal}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Novo Processo
                </button>
            </div>
        </div>
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-1/3">
                <input type="text" placeholder="Buscar por Nº SEI ou Objeto..." className="pl-3 pr-3 py-1.5 w-full text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <select className="px-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold text-slate-600" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Status: Todos</option>
                    {LISTS.STATUS_PROCESSO.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
        <div className="overflow-auto h-full pb-12">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-100 text-slate-500 uppercase font-black sticky top-0 z-10 shadow-sm text-[9px] tracking-widest">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('numeroProcessoSei')}>Nº SEI {getSortIcon('numeroProcessoSei')}</th>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('objeto')}>Objeto {getSortIcon('objeto')}</th>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('classificacao')}>Classificação {getSortIcon('classificacao')}</th>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</th>
                        <th className="px-6 py-4 text-center cursor-pointer" onClick={() => requestSort('idle')}>Inativo {getSortIcon('idle')}</th>
                        <th className="px-6 py-4 text-center">Gestão</th>
                        <th className="px-6 py-4 text-center">Itens</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredAndSortedProcesses.map((proc) => {
                        const idleDays = calculateIdleTime(proc.dataUltimaMovimentacao);
                        return (
                            <tr key={proc.id} onClick={() => setSelectedProcessId(selectedProcessId === proc.id ? null : proc.id)} className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedProcessId === proc.id ? 'bg-blue-50 shadow-inner' : ''}`}>
                                <td className="px-6 py-4 font-black text-slate-900 text-[10px] font-mono tracking-tighter">{proc.numeroProcessoSei}</td>
                                <td className="px-6 py-4 truncate max-w-xs text-[11px] font-bold text-slate-600 uppercase" title={proc.objeto}>{proc.objeto}</td>
                                <td className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-tighter">{proc.classificacao}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${getStatusColor(proc.status)}`}>{proc.status}</span></td>
                                <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono shadow-sm ${idleDays > 30 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>{idleDays} d</span></td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={(e) => handleArchiveProcess(e, proc)} className="p-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" title="Arquivar">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        </button>
                                        <button onClick={(e) => handleOpenEditInfo(e, proc)} className="p-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Editar">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button onClick={(e) => handleOpenMove(e, proc)} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90" title="Movimentar">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                     <div className={`transition-transform duration-300 ${selectedProcessId === proc.id ? 'rotate-90' : ''}`}>
                                        <svg className={`w-5 h-5 mx-auto ${selectedProcessId === proc.id ? 'text-indigo-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                     </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {selectedProcessId && selectedProcess && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-slide-up h-96 flex-shrink-0">
            <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex justify-between items-center">
                <h3 className="font-black text-indigo-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    Composição Analítica de Itens
                </h3>
                <div className="flex items-center gap-4">
                    <button onClick={handleOpenItemModal} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Novo Item
                    </button>
                    <button onClick={() => setSelectedProcessId(null)} className="text-slate-400 hover:text-red-600 font-bold p-1 hover:bg-red-50 rounded transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-slate-400 uppercase font-black sticky top-0 text-[9px] tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-center w-16">Ref</th>
                            <th className="px-6 py-4">Código</th>
                            <th className="px-6 py-4">Descrição do Objeto</th>
                            <th className="px-6 py-4 text-center">Qtd</th>
                            <th className="px-6 py-4 text-right">Valor Unit.</th>
                            <th className="px-6 py-4 text-right">Total</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                        {items.length > 0 ? items.map((item) => {
                            const unitVal = item.valorUnitario || item.valorUnitarioEstimado;
                            const isHomologated = !!item.valorUnitario;
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 text-center font-black text-slate-300 group-hover:text-slate-900">{item.numeroItem}</td>
                                    <td className="px-6 py-4 font-mono text-[10px] text-blue-600 font-black tracking-tighter uppercase">{item.codigoItem}</td>
                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase leading-tight">{item.descricao}</td>
                                    <td className="px-6 py-4 text-center font-black text-slate-800 font-mono text-base">{item.quantidadeEstimada}</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-[11px]">
                                        <div className="flex flex-col items-end">
                                            <span className={isHomologated ? 'text-green-700' : 'text-slate-500'}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitVal)}
                                            </span>
                                            {isHomologated && (
                                                <span className="text-[8px] text-slate-400 uppercase tracking-tighter italic">Est: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitarioEstimado)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-indigo-900 font-mono text-[12px] bg-indigo-50/20">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidadeEstimada * unitVal)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleOpenEditItem(e, item)} className="p-2 text-indigo-600 bg-white border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white shadow-sm transition-all"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={(e) => handleRequestDeleteItem(e, item)} className="p-2 text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-600 hover:text-white shadow-sm transition-all"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic font-black uppercase text-[10px] tracking-[0.3em]">Nenhum item localizado no dossiê SEI deste processo.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE HOMOLOGAÇÃO (Assistente) */}
      {isHomologationConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[140] flex items-center justify-center backdrop-blur-xl p-4 animate-fade-in">
            <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-[12px] border-green-600">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-green-100">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tighter leading-none">Processo Homologado?</h3>
                <p className="text-[11px] text-slate-500 mb-8 leading-relaxed font-semibold uppercase tracking-wide px-4">
                    Deseja informar os <span className="text-green-600 font-black">valores finais</span> de adjudicação para os itens deste processo?
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleFinishHomologation(false)} className="px-4 py-4 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Não, Manter Est.</button>
                    <button onClick={handleStartHomologationValues} className="px-4 py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 hover:bg-green-700 transition-all uppercase text-[10px] tracking-widest active:scale-95">Sim, Informar</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: ENTRADA DE VALORES HOMOLOGADOS */}
      {isHomologationValuesModalOpen && editingProcessData && (
        <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100">
                <div className="bg-green-600 p-8 border-b border-green-700 flex justify-between items-center text-white">
                    <div className="flex items-center gap-5">
                        <div className="bg-white/20 p-4 rounded-2xl shadow-xl">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Valores Adjudicados</h3>
                            <p className="text-[10px] text-green-100 font-mono font-black uppercase tracking-widest mt-2">Dossiê: {editingProcessData.numeroProcessoSei}</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">Lista de Itens para Adjudicação de Preços</p>
                    {allProcessItems.filter(i => i.processoSeiId === editingProcessData.id).map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 transition-all hover:border-green-300">
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Item {item.numeroItem} • {item.codigoItem}</span>
                                <h4 className="text-xs font-black text-slate-700 uppercase leading-tight line-clamp-2">{item.descricao}</h4>
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-tighter text-right">Vl. Adjudicado (Unitário)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl font-mono font-black text-green-700 bg-slate-50 focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all text-right"
                                        value={homologationValues[item.id] || 0}
                                        onChange={e => setHomologationValues({ ...homologationValues, [item.id]: Number(e.target.value) })}
                                    />
                                </div>
                                <span className="block text-[8px] font-bold text-slate-300 uppercase tracking-tighter text-right mt-1.5">Original Est: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitarioEstimado)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-8 bg-white border-t border-slate-100 flex justify-end gap-5">
                    <button onClick={() => setIsHomologationValuesModalOpen(false)} className="px-8 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest transition-all">Voltar</button>
                    <button onClick={() => handleFinishHomologation(true)} className="px-10 py-4 bg-green-600 text-white font-black rounded-2xl shadow-[0_10px_30px_-5px_rgba(22,163,74,0.5)] hover:bg-green-700 transition-all uppercase text-[10px] tracking-[0.15em] active:scale-95 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Salvar e Concluir Homologação
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO DE ITEM - ATUALIZADO COM MELHORIA NA EXIBIÇÃO DE VALORES */}
      {isEditItemModalOpen && editingItemData && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-indigo-200">
                <div className="bg-indigo-600 p-6 border-b border-indigo-700 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Editar Item do Processo</h3>
                            <p className="text-xs text-indigo-100 uppercase tracking-widest font-semibold mt-1">Item {editingItemData.numeroItem} • Ref: {editingItemData.codigoItem}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsEditItemModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleUpdateItem} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Código</label>
                             <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow bg-slate-50" value={editingItemData.tipoCodigo} onChange={(e) => setEditingItemData({...editingItemData, tipoCodigo: e.target.value as TipoCodigo})}>{LISTS.TIPOS_CODIGO.map((tipo) => (<option key={tipo} value={tipo}>{tipo}</option>))}</select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Código Identificador</label>
                             <input type="text" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm" value={editingItemData.codigoItem} onChange={(e) => setEditingItemData({...editingItemData, codigoItem: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição Detalhada do Objeto</label>
                        <textarea className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none h-24 text-sm leading-relaxed" value={editingItemData.descricao} onChange={(e) => setEditingItemData({...editingItemData, descricao: e.target.value})} required />
                    </div>
                    
                    {/* ÁREA DE VALORES MELHORADA */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter">Qtd. Estimada</label>
                             <input 
                                type="number" 
                                required 
                                min="1" 
                                className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none font-black text-slate-700 text-lg text-center shadow-sm" 
                                value={editingItemData.quantidadeEstimada} 
                                onChange={(e) => setEditingItemData({...editingItemData, quantidadeEstimada: Number(e.target.value)})} 
                             />
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter">Vl. Unit. Inicial</label>
                             <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none font-mono font-black text-slate-600 bg-white text-sm" 
                                    value={editingItemData.valorUnitarioEstimado} 
                                    onChange={(e) => setEditingItemData({...editingItemData, valorUnitarioEstimado: Number(e.target.value)})} 
                                />
                             </div>
                             <p className="text-[8px] font-bold text-slate-400 text-right uppercase">Subtotal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editingItemData.quantidadeEstimada * editingItemData.valorUnitarioEstimado)}</p>
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Vl. Unit. Final</label>
                             <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="w-full pl-8 pr-3 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none font-mono font-black text-indigo-700 bg-white text-sm" 
                                    value={editingItemData.valorUnitario || 0} 
                                    onChange={(e) => setEditingItemData({...editingItemData, valorUnitario: Number(e.target.value)})} 
                                />
                             </div>
                             <p className="text-[8px] font-black text-indigo-500 text-right uppercase">Adjudicado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editingItemData.quantidadeEstimada * (editingItemData.valorUnitario || 0))}</p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => setIsEditItemModalOpen(false)} className="px-5 py-3 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button type="submit" className="px-8 py-3 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-xl flex items-center gap-2 transform active:scale-95 shadow-indigo-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {/* MODAL: NOVO ITEM - ATUALIZADO PARA CONSISTÊNCIA VISUAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-green-200">
                <div className="bg-green-600 p-6 border-b border-green-700 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Novo Item do Processo</h3>
                            <p className="text-xs text-green-100 uppercase tracking-widest font-semibold mt-1">Adicionar ao Dossiê</p>
                        </div>
                    </div>
                    <button onClick={() => setIsItemModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveItem(false); }} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Código</label>
                             <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition-shadow bg-slate-50" value={newItemData.tipoCodigo} onChange={(e) => setNewItemData({...newItemData, tipoCodigo: e.target.value as TipoCodigo})}>{LISTS.TIPOS_CODIGO.map((tipo) => (<option key={tipo} value={tipo}>{tipo}</option>))}</select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Código Identificador</label>
                             <input type="text" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none font-mono text-sm" value={newItemData.codigoItem} onChange={(e) => setNewItemData({...newItemData, codigoItem: e.target.value})} placeholder="Ex: 45021" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição Detalhada do Objeto</label>
                        <textarea className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none resize-none h-24 text-sm leading-relaxed" value={newItemData.descricao} onChange={(e) => setNewItemData({...newItemData, descricao: e.target.value})} required placeholder="Descrição completa..." />
                    </div>

                    {/* VALORES NOVO ITEM */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter">Quantidade</label>
                             <input 
                                type="number" 
                                required 
                                min="1" 
                                className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-100 outline-none font-black text-slate-700 text-lg text-center" 
                                value={newItemData.quantidadeEstimada} 
                                onChange={(e) => setNewItemData({...newItemData, quantidadeEstimada: Number(e.target.value)})} 
                             />
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-green-600 uppercase tracking-tighter">Vl. Unit. Inicial</label>
                             <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-green-400">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="w-full pl-8 pr-3 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-100 outline-none font-mono font-black text-green-700 bg-white text-sm" 
                                    value={newItemData.valorUnitarioEstimado || 0} 
                                    onChange={(e) => setNewItemData({...newItemData, valorUnitarioEstimado: Number(e.target.value)})} 
                                />
                             </div>
                             <p className="text-[8px] font-bold text-green-500 text-right uppercase">Subtotal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newItemData.quantidadeEstimada * newItemData.valorUnitarioEstimado)}</p>
                        </div>
                        <div className="space-y-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter">Vl. Unit. Final</label>
                             <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-100 outline-none font-mono font-bold text-slate-400 bg-slate-50 text-sm" 
                                    value={newItemData.valorUnitario || 0} 
                                    onChange={(e) => setNewItemData({...newItemData, valorUnitario: Number(e.target.value)})} 
                                />
                             </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-between gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-5 py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => handleSaveItem(true)} className="px-4 py-3 text-[10px] font-black text-green-700 bg-green-100 border border-green-200 rounded-xl hover:bg-green-200 transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                Salvar e Novo
                            </button>
                            <button type="submit" className="px-6 py-3 text-[10px] font-black text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest shadow-green-100">Salvar Item</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isContractGenModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"><div className="bg-green-50 p-6 border-b border-green-100"><h3 className="text-lg font-bold text-green-900">Gerar Contrato (Vincular)</h3></div><div className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Nº Contrato" className="border rounded px-3 py-2" value={contractGenData.numeroContrato} onChange={e => setContractGenData({...contractGenData, numeroContrato: e.target.value})} /><input type="text" placeholder="Fornecedor" className="border rounded px-3 py-2" value={contractGenData.fornecedor} onChange={e => setContractGenData({...contractGenData, fornecedor: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><input type="date" className="border rounded px-3 py-2" value={contractGenData.dataInicio} onChange={e => setContractGenData({...contractGenData, dataInicio: e.target.value})} /><input type="date" className="border rounded px-3 py-2" value={contractGenData.dataFim} onChange={e => setContractGenData({...contractGenData, dataFim: e.target.value})} /></div><div className="max-h-40 overflow-y-auto border rounded"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Item</th><th className="p-2">Incluir</th></tr></thead><tbody>{allProcessItems.filter(i => editingProcessData && i.processoSeiId === editingProcessData.id).map(item => (<tr key={item.id}><td className="p-2">{item.descricao}</td><td className="p-2 text-center"><input type="checkbox" checked={contractGenData.selectedItems[item.id] || false} onChange={e => setContractGenData({...contractGenData, selectedItems: {...contractGenData.selectedItems, [item.id]: e.target.checked}})} /></td></tr>))}</tbody></table></div><div className="flex justify-end gap-3 pt-4"><button onClick={() => setIsContractGenModalOpen(false)} className="text-slate-600">Cancelar</button><button onClick={handleGenerateContract} className="bg-green-600 text-white px-4 py-2 rounded">Gerar Contrato</button></div></div></div></div>
      )}

      {isAtaQuantityModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center"><h3 className="text-lg font-bold text-slate-800 mb-4">Geração de Atas SRP</h3><p className="text-slate-600 text-sm mb-4">Quantas Atas distintas deseja gerar para este processo?</p><input type="number" min="1" max="10" className="w-20 text-center border rounded px-3 py-2 text-lg font-bold mx-auto block mb-6" value={ataQuantityToGenerate} onChange={(e) => setAtaQuantityToGenerate(Number(e.target.value))} /><button onClick={startAtaGenerationLoop} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">Iniciar Assistente</button></div></div>
      )}

      {isAtaGenModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"><div className="bg-blue-50 p-6 border-b border-blue-100 flex justify-between"><h3 className="text-lg font-bold text-blue-900">{editingAtaId ? 'Editar Ata' : `Gerar Ata ${currentAtaIndex} de ${ataQuantityToGenerate}`}</h3></div><div className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Nº Ata (ex: 010/2024)" className="border rounded px-3 py-2" value={ataGenData.numeroAta} onChange={e => setAtaGenData({...ataGenData, numeroAta: e.target.value})} /><input type="text" placeholder="Fornecedor" className="border rounded px-3 py-2" value={ataGenData.fornecedor} onChange={e => setAtaGenData({...ataGenData, fornecedor: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><input type="date" className="border rounded px-3 py-2" value={ataGenData.dataAssinatura} onChange={e => setAtaGenData({...ataGenData, dataAssinatura: e.target.value})} /><input type="date" className="border rounded px-3 py-2" value={ataGenData.dataVencimento} onChange={e => setAtaGenData({...ataGenData, dataVencimento: e.target.value})} /></div><div className="max-h-48 overflow-y-auto border rounded"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Item</th><th className="p-2 w-20 text-center"><input type="checkbox" onChange={(e) => handleSelectAllAvailableItems(e.target.checked)} /></th></tr></thead><tbody>{allProcessItems.filter(i => editingProcessData && i.processoSeiId === editingProcessData.id).map(item => { const existingAta = getExistingAtaForItem(editingProcessData!.id, item.codigoItem, editingAtaId); const isSelf = editingAtaId && getExistingAtaForItem(editingProcessData!.id, item.codigoItem, null) === ataGenData.numeroAta; const disabled = !!existingAta && !isSelf; return (<tr key={item.id} className={disabled ? 'opacity-50 bg-slate-50' : ''}><td className="p-2"><div className="font-medium">{item.descricao}</div>{disabled && <span className="text-xs text-red-500">Já na Ata {existingAta}</span>}</td><td className="p-2 text-center"><input type="checkbox" disabled={disabled} checked={ataGenData.selectedItems[item.id] || false} onChange={e => setAtaGenData({...ataGenData, selectedItems: {...ataGenData.selectedItems, [item.id]: e.target.checked}})} /></td></tr>); })}</tbody></table></div><div className="flex justify-end gap-3 pt-4"><button onClick={() => setIsAtaGenModalOpen(false)} className="text-slate-600">Cancelar</button><div className="flex gap-2">{!editingAtaId && currentAtaIndex < ataQuantityToGenerate && (<button onClick={() => handleSaveAta(true)} className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">Salvar e Encerrar</button>)}<button onClick={() => handleSaveAta(false)} className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm">{currentAtaIndex < ataQuantityToGenerate && !editingAtaId ? 'Salvar e Próxima' : 'Salvar Ata'}</button></div></div></div></div></div>
      )}

      {archiveConfirmation.isOpen && archiveConfirmation.process && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all scale-100"><div className="flex items-center gap-3 mb-4 text-amber-600"><div className="bg-amber-100 p-2 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><h3 className="text-lg font-bold text-slate-800">Confirmar Arquivamento</h3></div><p className="text-slate-600 mb-6">Deseja arquivar o processo <strong>{archiveConfirmation.process.numeroProcessoSei}</strong>?<br/><br/><span className="text-xs text-slate-500">Ele sairá da lista principal e poderá ser consultado no módulo "Arquivo".</span></p><div className="flex justify-end gap-3"><button onClick={() => setArchiveConfirmation({ isOpen: false, process: null })} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><button onClick={handleConfirmArchive} className="px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm">Arquivar</button></div></div></div>
      )}

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all scale-100"><div className="flex items-center gap-3 mb-4 text-red-600"><div className="bg-red-100 p-2 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div><h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3></div><p className="text-slate-600 mb-6">Tem certeza que deseja excluir <strong>{deleteConfirmation.title}</strong>? <br/><br/><span className="text-xs text-red-500 font-semibold">Esta ação não poderá ser desfeita.</span></p><div className="flex justify-end gap-3"><button onClick={() => setDeleteConfirmation({...deleteConfirmation, isOpen: false})} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><button onClick={handleConfirmDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm">Sim, Excluir</button></div></div></div>
      )}

      {isEditProcessModalOpen && editingProcessData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${editMode === 'FLOW' ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${editMode === 'FLOW' ? 'text-indigo-800' : 'text-slate-800'}`}>
                        {editMode === 'FLOW' ? (<><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>Movimentar & Gerenciar</>) : (<><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Editar Dados do Processo</>)}
                    </h3>
                    <button onClick={() => setIsEditProcessModalOpen(false)} className="text-slate-400 hover:text-slate-600">X</button>
                </div>
                <form onSubmit={handleUpdateProcess} className="p-6 space-y-4">
                    <div className="text-xs text-slate-400 mb-2 p-2 bg-slate-100 rounded border border-slate-200 font-mono flex justify-between"><span>ID: {editingProcessData.id}</span><span className="font-bold">{editMode === 'FLOW' ? 'Modo Fluxo' : 'Modo Edição'}</span></div>
                    {editMode === 'INFO' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nº Processo SEI</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingProcessData.numeroProcessoSei} onChange={(e) => setEditingProcessData({...editingProcessData, numeroProcessoSei: e.target.value})} /></div>
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Data Início</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingProcessData.dataInicio.split('T')[0]} onChange={(e) => setEditingProcessData({...editingProcessData, dataInicio: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Modalidade</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingProcessData.modalidade} onChange={(e) => setEditingProcessData({...editingProcessData, modalidade: e.target.value as Modalidade})}>{LISTS.MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Classificação</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingProcessData.classificacao} onChange={(e) => setEditingProcessData({...editingProcessData, classificacao: e.target.value as ClassificacaoProcesso})}>{LISTS.CLASSIFICACOES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            </div>
                            <div><label className="block text-sm font-semibold text-indigo-700 mb-1">Ano de Planejamento (LOA)</label><input type="number" className="w-32 px-3 py-2 border border-indigo-200 bg-indigo-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-800" value={editingProcessData.anoPlanejamento} onChange={(e) => setEditingProcessData({...editingProcessData, anoPlanejamento: Number(e.target.value)})} /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Setor Requisitante</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingProcessData.setorRequisitante} onChange={(e) => setEditingProcessData({...editingProcessData, setorRequisitante: e.target.value as UnidadeDemandante})}>{LISTS.UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Objeto</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-20" value={editingProcessData.objeto} onChange={(e) => setEditingProcessData({...editingProcessData, objeto: e.target.value})} /></div>
                        </>
                    )}
                    {editMode === 'FLOW' && (
                        <>
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200"><label className="block text-sm font-bold text-indigo-800 mb-1">Status / Fase Atual</label><select className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-700" value={editingProcessData.status} onChange={(e) => setEditingProcessData({...editingProcessData, status: e.target.value as StatusProcesso})}>{LISTS.STATUS_PROCESSO.map((status) => (<option key={status} value={status}>{status}</option>))}</select><p className="text-xs text-indigo-600 mt-2">* Alterar para <strong>HOMOLOGAÇÃO</strong>, <strong>ATA R P</strong> ou <strong>CONTRATO</strong> iniciará o assistente de geração/valores.</p></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Última Movimentação</label><div className="flex gap-2"><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editingProcessData.dataUltimaMovimentacao ? editingProcessData.dataUltimaMovimentacao.split('T')[0] : ''} onChange={(e) => setEditingProcessData({...editingProcessData, dataUltimaMovimentacao: e.target.value + 'T12:00:00'})} /><button type="button" onClick={handleSetToday} className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1" title="Definir como Hoje">Hoje</button></div></div>
                        </>
                    )}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2"><button type="button" onClick={() => setIsEditProcessModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">Cancelar</button><button type="submit" className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm ${editMode === 'FLOW' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{editMode === 'FLOW' ? 'Salvar Movimentação' : 'Salvar Dados'}</button></div>
                </form>
            </div>
        </div>
      )}

      {isDateConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all scale-100"><h3 className="text-lg font-bold text-slate-800 mb-4">Confirmar Data</h3><p className="text-slate-600 mb-6">Deseja atualizar a data da última movimentação para hoje?</p><div className="flex justify-end gap-3"><button onClick={() => setIsDateConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button><button onClick={confirmSetToday} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Sim, Hoje</button></div></div></div>
      )}

    </div>
  );
};
