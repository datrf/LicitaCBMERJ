import React, { useMemo, useState } from 'react';
import { Processo, AtaSrp, Contrato, MovimentoConsumo, StatusProcesso, ItemProcesso, Modalidade, ClassificacaoProcesso } from '../types';
import { MOCK_ITENS_ATA, LISTS } from '../constants';

interface StatisticsModuleProps {
    processes: Processo[];
    items: ItemProcesso[]; // NEW PROP
    atas: AtaSrp[];
    contracts: Contrato[];
    movements: MovimentoConsumo[];
}

// Updated Report Types for Strategic View
type ReportType = 'SAVINGS' | 'MODALITY_MATRIX' | 'CLASSIFICATION' | 'SEASONALITY' | 'LEAD_TIME' | 'PLANNING_HEALTH';

export const StatisticsModule: React.FC<StatisticsModuleProps> = ({ processes, items, atas, contracts, movements }) => {
    const [selectedReport, setSelectedReport] = useState<ReportType>('SAVINGS');
    
    // --- FILTERS STATE ---
    const [filterYear, setFilterYear] = useState<number | 'all'>('all');
    const [filterClassificacao, setFilterClassificacao] = useState<string>('all');
    const [showDataDetails, setShowDataDetails] = useState(false);

    // --- FILTERING LOGIC ---
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        processes.forEach(p => {
            if (typeof p.anoPlanejamento === 'number') {
                years.add(p.anoPlanejamento);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [processes]);

    // Master Filtered Data
    const filteredData = useMemo(() => {
        // 1. Filter Processes
        const filteredProcs = processes.filter(p => {
            const matchYear = filterYear === 'all' || p.anoPlanejamento === filterYear;
            const matchClass = filterClassificacao === 'all' || p.classificacao === filterClassificacao;
            return matchYear && matchClass; 
        });

        const filteredProcIds = new Set(filteredProcs.map(p => p.id));

        // 2. Filter Linked Objects based on filtered processes
        const filteredAtas = atas.filter(a => filteredProcIds.has(a.processoSeiId));
        const filteredContracts = contracts.filter(c => 
            (c.processoSeiId && filteredProcIds.has(c.processoSeiId)) || 
            (c.ataId && filteredAtas.some(a => a.id === c.ataId))
        );

        return {
            processes: filteredProcs,
            atas: filteredAtas,
            contracts: filteredContracts
        };
    }, [processes, atas, contracts, filterYear, filterClassificacao]);

    const { processes: finalProcs, atas: finalAtas, contracts: finalContracts } = filteredData;

    // --- DATA CALCULATION HELPERS ---

    // 1. Economicidade (Global)
    const savingsData = useMemo(() => {
        const concludedProcessIds = new Set(
            finalProcs
                .filter(p => ['CONTRATO', 'ATA R P', 'CONCLUÍDO', 'CTT Assinado', 'ENTREGUE'].some(s => p.status.includes(s)))
                .map(p => p.id)
        );

        let totalEstimated = 0;
        let totalContracted = 0;

        concludedProcessIds.forEach(procId => {
            const procItems = items.filter(i => i.processoSeiId === procId);
            totalEstimated += procItems.reduce((acc, i) => acc + (i.quantidadeEstimada * i.valorUnitarioEstimado), 0);

            const procContracts = finalContracts.filter(c => c.processoSeiId === procId);
            totalContracted += procContracts.reduce((acc, c) => acc + c.valorGlobal, 0);

            const procAtas = finalAtas.filter(a => a.processoSeiId === procId);
            procAtas.forEach(ata => {
                const ataItems = MOCK_ITENS_ATA.filter(i => i.ataId === ata.id);
                totalContracted += ataItems.reduce((acc, i) => acc + (i.quantidadeRegistrada * i.valorUnitario), 0);
            });
        });

        return { estimated: totalEstimated, contracted: totalContracted, diff: totalEstimated - totalContracted };
    }, [finalProcs, finalAtas, finalContracts, items]);

    // 2. NEW: Modality Efficiency Matrix (Time vs Money)
    const modalityMatrix = useMemo(() => {
        const stats: Record<string, { count: number, totalDays: number, totalSavingsPct: number }> = {};

        finalProcs.forEach(p => {
            // Calculate Duration
            let days = 0;
            if (p.dataInicio && p.dataUltimaMovimentacao) {
                const start = new Date(p.dataInicio).getTime();
                const end = new Date(p.dataUltimaMovimentacao).getTime();
                days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
            }

            // Calculate Economy (Simulation for demo purposes per process)
            let savingsPct = 0;
            // Simulated logic: SRP usually saves more, Direct Purchase saves less but is fast
            if (p.modalidade === Modalidade.PREGAO_SRP) savingsPct = 25; 
            else if (p.modalidade === Modalidade.PREGAO_ELETRONICO) savingsPct = 20;
            else if (p.modalidade === Modalidade.ADESAO_ARP) savingsPct = 15;
            else savingsPct = 5;

            savingsPct += (Math.random() * 10 - 5); 

            if (!stats[p.modalidade]) stats[p.modalidade] = { count: 0, totalDays: 0, totalSavingsPct: 0 };
            stats[p.modalidade].count++;
            stats[p.modalidade].totalDays += days;
            stats[p.modalidade].totalSavingsPct += savingsPct;
        });

        return Object.entries(stats).map(([mod, data]) => ({
            modality: mod,
            avgDays: Math.round(data.totalDays / data.count),
            avgSavings: parseFloat((data.totalSavingsPct / data.count).toFixed(1)),
            count: data.count
        })).sort((a, b) => b.avgSavings - a.avgSavings);
    }, [finalProcs]);

    // 2.1 NEW: Bidding Counts Summary (For Modality Header)
    const biddingCounts = useMemo(() => {
        let pregoes = 0;
        let dispensas = 0;
        let adesoes = 0;

        finalProcs.forEach(p => {
            if (p.modalidade === Modalidade.PREGAO_ELETRONICO || p.modalidade === Modalidade.PREGAO_SRP) {
                pregoes++;
            } else if (p.modalidade === Modalidade.DISPENSA_ELETRONICA || p.modalidade === Modalidade.DISPENSA_ART_75 || p.modalidade === Modalidade.INEXIGIBILIDADE) {
                dispensas++;
            } else if (p.modalidade === Modalidade.ADESAO_ARP) {
                adesoes++;
            }
        });
        
        return { pregoes, dispensas, adesoes };
    }, [finalProcs]);

    // 3. NEW: Classification Distribution
    const classificationData = useMemo(() => {
        const counts: Record<string, { count: number, value: number }> = {};
        
        finalProcs.forEach(p => {
            const cls = p.classificacao || 'Não Classificado';
            if (!counts[cls]) counts[cls] = { count: 0, value: 0 };
            counts[cls].count++;
            
            // Calculate approximate value for context
            const procItems = items.filter(i => i.processoSeiId === p.id);
            const val = procItems.reduce((acc, i) => acc + (i.quantidadeEstimada * i.valorUnitarioEstimado), 0);
            counts[cls].value += val;
        });

        return Object.entries(counts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);
    }, [finalProcs, items]);

    // 4. NEW: Seasonality (Execution Rhythm)
    const seasonalityData = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = months.map(m => ({ month: m, opened: 0, concluded: 0 }));

        finalProcs.forEach(p => {
            if (p.dataInicio) {
                const monthIdx = new Date(p.dataInicio).getMonth();
                if (data[monthIdx]) data[monthIdx].opened++;
            }
            // Check conclusion
            if (['CONCLUÍDO', 'CONTRATO', 'ATA'].some(s => p.status.includes(s)) && p.dataUltimaMovimentacao) {
                const monthIdx = new Date(p.dataUltimaMovimentacao).getMonth();
                if (data[monthIdx]) data[monthIdx].concluded++;
            }
        });
        return data;
    }, [finalProcs]);

    // 5. Planning Health
    const planningData = useMemo(() => {
        const counts: Record<string, number> = {
            'Planejamento': 0,
            'Licitação': 0,
            'Contratado': 0,
            'Problema': 0
        };

        finalProcs.forEach(p => {
            if ([StatusProcesso.DOD, StatusProcesso.PESQ_MERC, StatusProcesso.CHECK_LIST].some(s => p.status.includes(s))) {
                counts['Planejamento']++;
            } else if ([StatusProcesso.EDITAL, StatusProcesso.PREGAO_AGENDADO, StatusProcesso.HABILITACAO].some(s => p.status.includes(s))) {
                counts['Licitação']++;
            } else if ([StatusProcesso.CONTRATO, StatusProcesso.ATA_RP, StatusProcesso.CONCLUIDO, StatusProcesso.ENTREGUE].some(s => p.status.includes(s))) {
                counts['Contratado']++;
            } else {
                counts['Problema']++;
            }
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [finalProcs]);

    // --- INSIGHTS GENERATOR ---
    const insights = useMemo(() => {
        const tips = [];
        
        // Insight 1: Efficiency
        const fastest = modalityMatrix.sort((a,b) => a.avgDays - b.avgDays)[0];
        if (fastest) tips.push(`A modalidade mais ágil é "${fastest.modality}" com média de ${fastest.avgDays} dias.`);

        // Insight 2: Classification
        const topClass = classificationData[0];
        if (topClass) tips.push(`A maior demanda é por "${topClass.name}" com ${topClass.count} processos.`);

        // Insight 3: Volume de Pregões
        if (biddingCounts.pregoes > 0) tips.push(`Total de ${biddingCounts.pregoes} Pregões (SRP/Eletrônico) gerenciados no período.`);

        return tips;
    }, [modalityMatrix, seasonalityData, classificationData, biddingCounts]);


    // --- RENDER HELPERS ---

    return (
        <div className="flex flex-col h-full animate-fade-in relative">
            
            {/* --- HEADER & FILTERS BAR --- */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 leading-tight">Inteligência Estratégica</h2>
                        <p className="text-xs text-slate-500">Análise de Eficiência e Fluxo</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center justify-end w-full md:w-auto">
                    {/* Year Filter */}
                    <div className="relative">
                        <select 
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-2 font-semibold cursor-pointer"
                        >
                            <option value="all">Todos os Anos</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Classification Filter */}
                    <div className="relative">
                        <select 
                            value={filterClassificacao}
                            onChange={(e) => setFilterClassificacao(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-2 font-semibold cursor-pointer"
                        >
                            <option value="all">Todas Classificações</option>
                            {LISTS.CLASSIFICACOES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>

                    <button className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Exportar PDF">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                </div>
            </div>

            {/* --- DASHBOARD CONTENT --- */}
            <div className="flex flex-col gap-6 overflow-y-auto pb-10 flex-1">
                
                {/* 1. AUTOMATED INSIGHTS (NEW) */}
                {insights.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-4">
                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 mt-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900 mb-1">Insights da Análise</h4>
                            <ul className="text-sm text-indigo-700 space-y-1 list-disc list-inside">
                                {insights.map((tip, idx) => <li key={idx}>{tip}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {/* 2. REPORT TABS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="flex border-b border-slate-200 overflow-x-auto">
                        {[
                            { id: 'SAVINGS', label: 'Economicidade Real', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                            { id: 'MODALITY_MATRIX', label: 'Matriz de Eficiência', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                            { id: 'CLASSIFICATION', label: 'Por Classificação', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
                            { id: 'SEASONALITY', label: 'Ritmo & Sazonalidade', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
                            { id: 'PLANNING_HEALTH', label: 'Status Global', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setSelectedReport(tab.id as ReportType); setShowDataDetails(false); }}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                                    ${selectedReport === tab.id 
                                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                <svg className={`w-5 h-5 ${selectedReport === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8 min-h-[400px]">
                        {/* VIEW TOGGLE */}
                        <div className="flex justify-end mb-6">
                            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <button 
                                    onClick={() => setShowDataDetails(false)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!showDataDetails ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    Gráficos
                                </button>
                                <button 
                                    onClick={() => setShowDataDetails(true)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${showDataDetails ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    Dados
                                </button>
                            </div>
                        </div>

                        {/* ... Reports rendering using global 'items' state ... */}
                        {/* The logic above already uses the 'items' prop for calculations like 'savingsData' and 'classificationData' */}
                        {/* The JSX rendering remains identical */}
                        
                        {/* --- CONTENT 1: ECONOMICIDADE --- */}
                        {selectedReport === 'SAVINGS' && (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Performance Financeira</h3>
                                <p className="text-slate-500 mb-8">Eficácia das disputas de preços em relação ao orçamento base.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Total Estimado</p>
                                        <p className="text-2xl font-bold text-slate-800 mt-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(savingsData.estimated)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Total Contratado</p>
                                        <p className="text-2xl font-bold text-blue-600 mt-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(savingsData.contracted)}</p>
                                    </div>
                                    <div className="bg-green-50 p-5 rounded-xl border border-green-200 text-center">
                                        <p className="text-xs font-bold text-green-600 uppercase">Economia Gerada</p>
                                        <p className="text-3xl font-bold text-green-600 mt-1">{savingsData.estimated > 0 ? ((savingsData.diff / savingsData.estimated) * 100).toFixed(1) : 0}%</p>
                                        <p className="text-xs text-green-600 font-medium">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(savingsData.diff)})</p>
                                    </div>
                                </div>

                                {/* Visual Bar */}
                                <div className="relative h-12 bg-slate-100 rounded-full overflow-hidden flex items-center">
                                    <div 
                                        className="h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-1000"
                                        style={{ width: `${savingsData.estimated > 0 ? (savingsData.contracted / savingsData.estimated) * 100 : 0}%` }}
                                    >
                                        Contratado
                                    </div>
                                    <div className="flex-1 flex items-center justify-center text-green-700 text-xs font-bold bg-green-200 h-full">
                                        Economia
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- CONTENT 2: MATRIZ DE EFICIÊNCIA --- */}
                        {selectedReport === 'MODALITY_MATRIX' && (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Matriz de Eficiência (Tempo x Economia)</h3>
                                <p className="text-slate-500 mb-8">Comparativo estratégico entre as modalidades de compra.</p>
                                
                                {/* SUMMARY CARDS FOR BIDDING COUNTS */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                                        <span className="text-xs font-bold text-blue-600 uppercase">Total de Pregões</span>
                                        <div className="text-2xl font-bold text-blue-900 mt-1">{biddingCounts.pregoes}</div>
                                        <div className="text-[10px] text-blue-500 mt-1">Eletrônico + SRP</div>
                                     </div>
                                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col justify-center">
                                        <span className="text-xs font-bold text-amber-600 uppercase">Dispensas/Inex.</span>
                                        <div className="text-2xl font-bold text-amber-900 mt-1">{biddingCounts.dispensas}</div>
                                        <div className="text-[10px] text-amber-500 mt-1">Compras Diretas</div>
                                     </div>
                                     <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col justify-center">
                                        <span className="text-xs font-bold text-purple-600 uppercase">Adesões (Carona)</span>
                                        <div className="text-2xl font-bold text-purple-900 mt-1">{biddingCounts.adesoes}</div>
                                        <div className="text-[10px] text-purple-500 mt-1">Aproveitamento Externo</div>
                                     </div>
                                </div>

                                {showDataDetails ? (
                                    <table className="w-full text-left text-sm border rounded-lg">
                                        <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-2">Modalidade</th>
                                                <th className="px-4 py-2 text-center">Vol. Processos</th>
                                                <th className="px-4 py-2 text-center">Prazo Médio</th>
                                                <th className="px-4 py-2 text-center">Economia Média</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {modalityMatrix.map((m, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-3 font-medium">{m.modality}</td>
                                                    <td className="px-4 py-3 text-center">{m.count}</td>
                                                    <td className="px-4 py-3 text-center">{m.avgDays} dias</td>
                                                    <td className="px-4 py-3 text-center font-bold text-green-600">{m.avgSavings}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="space-y-6">
                                        {modalityMatrix.map((item, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition-shadow">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800">{item.modality}</h4>
                                                    <span className="text-xs text-slate-500">{item.count} processos analisados</span>
                                                </div>
                                                
                                                {/* Visual Indication: Time */}
                                                <div className="flex-1 flex flex-col items-center">
                                                    <span className="text-xs text-slate-400 uppercase mb-1">Agilidade (Prazo)</span>
                                                    <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                                                        <div className="bg-amber-400 h-2 rounded-full" style={{width: `${Math.min(100, (item.avgDays / 180) * 100)}%`}}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{item.avgDays} dias</span>
                                                </div>

                                                {/* Visual Indication: Savings */}
                                                <div className="flex-1 flex flex-col items-center">
                                                    <span className="text-xs text-slate-400 uppercase mb-1">Eficiência ($)</span>
                                                    <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                                                        <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min(100, item.avgSavings * 2)}%`}}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-green-600">{item.avgSavings}% Econ.</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- CONTENT 3: CLASSIFICATION DISTRIBUTION --- */}
                        {selectedReport === 'CLASSIFICATION' && (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Distribuição por Classificação</h3>
                                <p className="text-slate-500 mb-8">Volume de processos agrupados pela natureza da despesa/objeto.</p>
                                
                                {showDataDetails ? (
                                    <div className="overflow-x-auto border rounded-lg">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                                                <tr>
                                                    <th className="px-4 py-2">Classificação</th>
                                                    <th className="px-4 py-2 text-right">Qtd. Processos</th>
                                                    <th className="px-4 py-2 text-right">% do Total</th>
                                                    <th className="px-4 py-2 text-right">Valor Aprox.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y text-slate-700">
                                                {classificationData.map((d, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium">{d.name}</td>
                                                        <td className="px-4 py-3 text-right">{d.count}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500">
                                                            {((d.count / finalProcs.length) * 100).toFixed(1)}%
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(d.value)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {classificationData.map((item, idx) => (
                                            <div key={idx} className="group">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-semibold text-slate-700">{item.name}</span>
                                                    <span className="font-bold text-slate-900">{item.count} procs.</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
                                                    <div 
                                                        className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                                                        style={{ width: `${(item.count / Math.max(...classificationData.map(d => d.count))) * 100}%` }}
                                                    >
                                                        {item.count > 0 && <span className="text-[9px] text-white font-bold">{((item.count / finalProcs.length) * 100).toFixed(0)}%</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- CONTENT 4: SAZONALIDADE --- */}
                        {selectedReport === 'SEASONALITY' && (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Ritmo de Execução Anual</h3>
                                <p className="text-slate-500 mb-8">Processos Iniciados vs. Concluídos por mês.</p>

                                <div className="h-64 flex items-end justify-between gap-2 border-b border-slate-200 pb-2">
                                    {seasonalityData.map((d, i) => {
                                        const maxVal = Math.max(...seasonalityData.map(x => Math.max(x.opened, x.concluded)), 1);
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group">
                                                <div className="flex items-end gap-1 h-full w-full justify-center">
                                                    {/* Opened Bar */}
                                                    <div 
                                                        className="w-3 bg-blue-400 rounded-t-sm transition-all duration-500 relative group-hover:opacity-80" 
                                                        style={{height: `${(d.opened / maxVal) * 100}%`}}
                                                        title={`Abertos: ${d.opened}`}
                                                    ></div>
                                                    {/* Concluded Bar */}
                                                    <div 
                                                        className="w-3 bg-green-400 rounded-t-sm transition-all duration-500 relative group-hover:opacity-80" 
                                                        style={{height: `${(d.concluded / maxVal) * 100}%`}}
                                                        title={`Concluídos: ${d.concluded}`}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-medium">{d.month}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex justify-center gap-6 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                                        <span className="text-xs text-slate-600">Iniciados (DOD)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                                        <span className="text-xs text-slate-600">Concluídos/Contratados</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- CONTENT 5: STATUS GLOBAL --- */}
                        {selectedReport === 'PLANNING_HEALTH' && (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Visão Global da Carteira</h3>
                                <p className="text-slate-500 mb-8">Distribuição dos processos por macro-etapas.</p>
                                
                                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                                    {/* Donut Chart (CSS Only) */}
                                    <div className="relative w-64 h-64 rounded-full border-[16px] border-slate-100 shadow-inner flex items-center justify-center bg-white">
                                        {/* Simplified visual representation - In real d3/chartjs this would be dynamic slices */}
                                        <div className="absolute inset-0 rounded-full border-[16px] border-indigo-500 border-t-transparent border-l-transparent rotate-45 opacity-80"></div>
                                        <div className="absolute inset-0 rounded-full border-[16px] border-blue-400 border-b-transparent border-r-transparent -rotate-12 opacity-80"></div>
                                        
                                        <div className="text-center z-10">
                                            <span className="text-4xl font-bold text-slate-800">{finalProcs.length}</span>
                                            <span className="block text-xs text-slate-500 uppercase tracking-widest">Processos</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        {planningData.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full 
                                                        ${item.name.includes('Planejamento') ? 'bg-blue-400' : 
                                                          item.name.includes('Licitação') ? 'bg-indigo-400' :
                                                          item.name.includes('Contratado') ? 'bg-green-500' : 'bg-red-400'}`}>
                                                    </div>
                                                    <span className="text-slate-700 font-medium">{item.name}</span>
                                                </div>
                                                <span className="font-bold text-slate-900">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};