
// @google/genai Coding Guidelines followed
import { GoogleGenAI } from "@google/genai";

// Fixed: Initialization logic moved inside the export and uses recommended model
export const generateProcurementAssistance = async (prompt: string, context: string, dbData?: any): Promise<string> => {
    try {
        // Always use direct initialization with process.env.API_KEY
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const systemInstruction = `
            Você é um Analista de Dados Sênior e Especialista em Licitações do CBMERJ (Corpo de Bombeiros RJ).
            
            SUA MISSÃO:
            1. Analisar os dados fornecidos no formato JSON (Banco de Dados do Sistema).
            2. Responder a perguntas do usuário com base EXCLUSIVA nesses dados.
            3. Gerar relatórios técnicos, resumos executivos e tabelas comparativas.
            
            REGRAS DE FORMATAÇÃO:
            - Se o usuário pedir uma lista ou comparação, GERE UMA TABELA em Markdown.
            - Se o usuário pedir um relatório, use títulos (##), negrito (**texto**) e tópicos.
            - Valores monetários devem ser formatados como R$ X.XXX,XX.
            - Datas devem ser formatadas como DD/MM/AAAA.
            
            SOBRE OS DADOS:
            - 'processos': Lista de licitações.
            - 'itensProcesso': Itens solicitados em cada processo.
            - 'atas': Atas de Registro de Preços vigentes.
            - 'contratos': Contratos assinados.
            - 'movimentos': Histórico de consumo (pedidos de material).
            
            IMPORTANTE:
            - Seja preciso. Se a informação não estiver no JSON, diga que não encontrou. Não invente dados.
            - Ao calcular totais, some os valores unitários * quantidades.
        `;

        // Serialize DB Data to JSON string for context
        const dataContext = dbData ? `\n\n--- DADOS DO SISTEMA (JSON) ---\n${JSON.stringify(dbData, null, 2)}\n--- FIM DOS DADOS ---\n` : '';

        // Fixed: Use gemini-3-flash-preview for general text tasks as per guidelines
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Contexto: ${context}${dataContext}\n\nSolicitação do Usuário: ${prompt}`,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2, // Lower temperature for analytical precision
            }
        });

        // Fixed: Use .text property directly
        return response.text || "Não foi possível gerar uma resposta. Tente novamente.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Erro ao comunicar com o assistente inteligente. Verifique sua conexão.";
    }
};
