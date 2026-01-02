
import React, { useState, useMemo } from 'react';
import { generateProcurementAssistance } from '../services/geminiService';

interface AIAssistantProps {
  data?: any; 
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ data }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const availableYears = useMemo(() => {
    if (!data) return [];
    const years = new Set<number>();
    
    data.processos?.forEach((p: any) => p.anoPlanejamento && years.add(p.anoPlanejamento));
    data.irps?.forEach((i: any) => years.add(new Date(i.dataAbertura).getFullYear()));
    data.atas?.forEach((a: any) => years.add(new Date(a.dataAssinatura).getFullYear()));
    data.contratos?.forEach((c: any) => years.add(new Date(c.dataInicio).getFullYear()));
    data.movimentos?.forEach((m: any) => years.add(new Date(m.data).getFullYear()));

    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  const getFilteredData = () => {
    if (!data || selectedYear === 'all') return data;

    const filterByYear = (item: any, dateField: string) => {
        if (!item[dateField]) return false;
        return new Date(item[dateField]).getFullYear() === selectedYear;
    };

    return {
        processos: data.processos?.filter((p: any) => p.anoPlanejamento === selectedYear),
        itensProcesso: data.itensProcesso, 
        irps: data.irps?.filter((i: any) => filterByYear(i, 'dataAbertura')),
        atas: data.atas?.filter((a: any) => filterByYear(a, 'dataAssinatura')),
        contratos: data.contratos?.filter((c: any) => filterByYear(c, 'dataInicio')),
        movimentos: data.movimentos?.filter((m: any) => filterByYear(m, 'data'))
    };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setResponse('');
    
    const filteredDb = getFilteredData();
    const yearContext = selectedYear === 'all' ? "de todo o histórico do sistema" : `especificamente do exercício de ${selectedYear}`;

    const contextDescription = `Usuário está no módulo de Inteligência de Dados. O objetivo é extrair insights ${yearContext}. Ignore dados de outros anos se houver ambiguidade.`;

    const result = await generateProcurementAssistance(
      prompt, 
      contextDescription,
      filteredDb
    );
    
    setResponse(result);
    setLoading(false);
  };

  const handleDownloadDoc = () => {
    if (!response) return;

    const formatLine = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>');
    };

    const parseMarkdown = (md: string) => {
        const lines = md.split('\n');
        let html = '';
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    html += '<table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid black; margin-bottom: 20px;">';
                    const headers = line.split('|').filter(c => c.trim() !== '');
                    html += '<thead><tr style="background-color: #f3f4f6;">';
                    headers.forEach(h => {
                        html += `<th style="border: 1px solid black; padding: 8px; text-align: left; font-weight: bold;">${formatLine(h.trim())}</th>`;
                    });
                    html += '</tr></thead><tbody>';
                } else {
                    if (line.includes('---')) continue;
                    const cells = line.split('|');
                    if (cells[0] === '') cells.shift();
                    if (cells[cells.length - 1] === '') cells.pop();
                    html += '<tr>';
                    cells.forEach(c => {
                        html += `<td style="border: 1px solid black; padding: 8px;">${formatLine(c.trim())}</td>`;
                    });
                    html += '</tr>';
                }
            } else {
                if (inTable) { html += '</tbody></table>'; inTable = false; }
                if (line !== '') html += `<div style="margin-bottom: 10px;">${formatLine(line)}</div>`;
            }
        }
        if (inTable) html += '</tbody></table>';
        return html;
    };

    const htmlBody = parseMarkdown(response);
    const content = `
        <html>
        <head><meta charset='utf-8'><style>body { font-family: Arial, sans-serif; }</style></head>
        <body>
            <div style="text-align: center;">
                <h1 style="color: #b91c1c;">CBMERJ - Relatório de IA</h1>
                <p>Ano de Referência Analisado: ${selectedYear === 'all' ? 'Histórico Completo' : selectedYear}</p>
            </div>
            <hr/>
            ${htmlBody}
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_IA_${selectedYear}_${new Date().getTime()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const suggestions = [
    "Liste os 5 processos de maior valor estimado.",
    "Crie uma tabela com todas as Atas vigentes.",
    "Qual o total gasto em contratos de 'SERVIÇO'?",
    "Quais processos estão parados há mais de 30 dias?"
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Analista Virtual CBMERJ</h2>
                <p className="text-sm text-slate-500">Inteligência Artificial conectada à base de dados.</p>
            </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
            <label className="text-[10px] font-black text-indigo-400 uppercase px-2 tracking-widest">Base de Dados:</label>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-indigo-50 border-none text-indigo-700 text-xs font-black rounded-lg px-4 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
            >
                <option value="all">Todo o Histórico</option>
                {availableYears.map(year => <option key={year} value={year}>Exercício {year}</option>)}
            </select>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        <div className="w-full md:w-1/3 border-r border-slate-200 p-6 flex flex-col gap-4 bg-white z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 block">Pergunta para IA ({selectedYear === 'all' ? 'Base Global' : `Filtro: ${selectedYear}`})</label>
            <textarea
              className="w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-700 text-sm h-40 transition-all shadow-sm bg-white"
              placeholder="Ex: Qual o valor total contratado neste exercício?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Consultar Inteligência</>
            )}
          </button>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Atalhos Analíticos</p>
            <div className="flex flex-col gap-2">
                {suggestions.map((sug, i) => (
                    <button 
                        key={i}
                        onClick={() => setPrompt(sug)}
                        className="text-left text-[10px] font-bold uppercase tracking-tight text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 p-2.5 rounded-lg transition-colors border border-transparent hover:border-indigo-100 truncate"
                    >
                        ⚡ {sug}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-8 overflow-y-auto bg-slate-50">
          {response ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                      <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                      Parecer da IA • Ref: {selectedYear === 'all' ? 'Histórico Global' : `Exercício ${selectedYear}`}
                  </h3>
                  <div className="flex gap-2">
                     <button onClick={handleDownloadDoc} className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-md uppercase tracking-widest active:scale-95">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Baixar .DOC
                     </button>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div className="prose prose-slate max-w-none font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                    {response}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <div className="w-24 h-24 bg-slate-200 rounded-[2rem] flex items-center justify-center mb-6 rotate-12">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-500 mb-2 uppercase tracking-tighter">Motor de Inteligência Pronto</h3>
                <p className="max-w-sm text-center text-xs font-semibold uppercase tracking-widest text-slate-400 leading-relaxed">Selecione o ano de exercício no cabeçalho e faça uma pergunta sobre processos, atas ou consumos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
