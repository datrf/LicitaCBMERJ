
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import { IrpModule } from './components/IrpModule';
import { BiddingModule } from './components/BiddingModule';
import { ContractsModule } from './components/ContractsModule';
import { ExecutionModule } from './components/ExecutionModule';
import { ArchiveModule } from './components/ArchiveModule';
import { AIAssistant } from './components/AIAssistant';
import { StatisticsModule } from './components/StatisticsModule';
import { MOCK_MOVIMENTOS, MOCK_PROCESSOS, MOCK_ATAS, MOCK_CONTRATOS, MOCK_ITENS_PROCESSO, MOCK_IRPS, MOCK_IRP_ITENS, MOCK_ITENS_ATA } from './constants';
import { MovimentoConsumo, Processo, AtaSrp, Contrato, ItemProcesso, IrpCabecalho, IrpItem, ItemAta } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  // SHARED STATE: Processes
  const [processos, setProcessos] = useState<Processo[]>(MOCK_PROCESSOS);
  
  // SHARED STATE: Process Items
  const [itensProcesso, setItensProcesso] = useState<ItemProcesso[]>(MOCK_ITENS_PROCESSO);

  // SHARED STATE: IRPs
  const [irps, setIrps] = useState<IrpCabecalho[]>(MOCK_IRPS);
  const [irpItems, setIrpItems] = useState<IrpItem[]>(MOCK_IRP_ITENS);

  // SHARED STATE: Governance (Atas & Contracts & Itens Ata)
  const [atas, setAtas] = useState<AtaSrp[]>(MOCK_ATAS);
  const [ataItems, setAtaItems] = useState<ItemAta[]>(MOCK_ITENS_ATA); // Lifted state for Ata Items
  const [contratos, setContratos] = useState<Contrato[]>(MOCK_CONTRATOS);

  // SHARED STATE: Movements (Consumo)
  const [movements, setMovements] = useState<MovimentoConsumo[]>(MOCK_MOVIMENTOS);

  const handleAddMovement = (newMovement: MovimentoConsumo) => {
    setMovements(prev => [newMovement, ...prev]);
  };

  const handleUpdateMovement = (updatedMovement: MovimentoConsumo) => {
    setMovements(prev => prev.map(m => m.id === updatedMovement.id ? updatedMovement : m));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            processes={processos} 
            items={itensProcesso}
            irps={irps}
            atas={atas}
            contracts={contratos}
            movements={movements}
          />
        );
      case 'irp':
        return (
          <IrpModule 
            irps={irps}
            onUpdateIrps={setIrps}
            items={irpItems}
            onUpdateItems={setIrpItems}
          />
        );
      case 'bidding':
        return (
          <BiddingModule 
            processes={processos} 
            onUpdateProcesses={setProcessos}
            items={itensProcesso}
            onUpdateItems={setItensProcesso}
            irps={irps}
            irpItems={irpItems}
            // Passing Governance Setters for Auto-Generation
            atas={atas}
            onUpdateAtas={setAtas}
            ataItems={ataItems}
            onUpdateAtaItems={setAtaItems}
            contratos={contratos}
            onUpdateContratos={setContratos}
          />
        );
      case 'contracts':
        return (
          <ContractsModule 
            processes={processos} 
            processItems={itensProcesso} // NOVO: Passando itens do processo
            movements={movements} 
            atas={atas} 
            onUpdateAtas={setAtas}
            ataItems={ataItems} 
            contratos={contratos}
            onUpdateContratos={setContratos}
          />
        );
      case 'execution':
        return (
          <ExecutionModule 
            processes={processos} 
            atas={atas} 
            ataItems={ataItems} 
            movements={movements} 
            onAddMovement={handleAddMovement}
            onUpdateMovement={handleUpdateMovement}
          />
        );
      case 'statistics':
        return (
          <StatisticsModule 
            processes={processos}
            items={itensProcesso}
            atas={atas}
            contracts={contratos}
            movements={movements}
          />
        );
      case 'archive':
        return (
          <ArchiveModule 
            processes={processos} 
            onUpdateProcess={setProcessos}
            movements={movements}
            onUpdateMovement={handleUpdateMovement}
            ataItems={ataItems}
            atas={atas}
            onUpdateAtas={setAtas}
            contratos={contratos}
            onUpdateContratos={setContratos}
            items={itensProcesso}
            irps={irps}
            onUpdateIrps={setIrps}
            irpItems={irpItems}
          />
        );
      case 'ai':
        return (
          <AIAssistant 
            data={{
              processos,
              itensProcesso,
              contratos,
              atas,
              itensAta: ataItems,
              irps,
              movimentos: movements
            }}
          />
        );
      default:
        return <Dashboard processes={processos} items={itensProcesso} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      <div className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {currentView === 'dashboard' && 'Painel de Controle'}
              {currentView === 'irp' && 'Planejamento (IRP)'}
              {currentView === 'bidding' && 'Gestão de Processos'}
              {currentView === 'contracts' && 'Gestão de Contratos e Atas'}
              {currentView === 'execution' && 'Gestão de Consumo (Atas SRP)'}
              {currentView === 'statistics' && 'Estatísticas e B.I.'}
              {currentView === 'archive' && 'Arquivo Morto'}
              {currentView === 'ai' && 'Inteligência de Dados (IA)'}
            </h2>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                    SD
                </div>
                <div className="text-sm">
                    <p className="font-semibold text-slate-700">Maj. Silva</p>
                    <p className="text-xs text-slate-500">DGAL/CBMERJ</p>
                </div>
             </div>
          </div>
        </header>

        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
