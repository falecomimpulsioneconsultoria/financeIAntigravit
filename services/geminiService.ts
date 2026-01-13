
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Account, Category, AccountType, AIAnalysisResult } from "../types";

// Initialize the Google GenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema compartilhado para garantir consistência
const aiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ['HEALTHY', 'WARNING', 'CRITICAL'] },
    summary: { type: Type.STRING },
    insights: { 
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    recommendation: { type: Type.STRING },
    detailedReasoning: { type: Type.STRING }
  }
};

export const analyzeFinances = async (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  accountType: AccountType = 'PERSONAL'
): Promise<AIAnalysisResult | null> => {
  
  // Prepare data for the prompt to minimize token usage while giving context
  const accountSummary = accounts.map(a => `${a.name}: R$ ${a.balance.toFixed(2)}`).join(", ");
  
  // Filter last 30 days or up to 50 recent transactions for relevance
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50)
    .map(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
      return `- ${t.date}: ${t.description} (${catName}) | R$ ${t.amount} | ${t.type} | ${t.status}`;
    })
    .join("\n");

  const role = accountType === 'BUSINESS' ? 'Consultor Financeiro Empresarial' : 'Consultor Financeiro Pessoal';
  const context = accountType === 'BUSINESS' ? 'desta empresa' : 'deste usuário';

  const prompt = `
    Atue como um ${role} especialista. Analise os dados financeiros ${context}.
    
    Contexto das Contas (Saldo Atual):
    ${accountSummary}

    Transações Recentes:
    ${recentTransactions}

    Objetivo: Fornecer uma análise estratégica e estruturada.
    
    Regras de Retorno (JSON):
    1. 'status': Defina como 'HEALTHY' (Positivo/Seguro), 'WARNING' (Atenção/Cuidado) ou 'CRITICAL' (Perigo/Negativo) baseado na liquidez e fluxo.
    2. 'summary': Una frase de impacto resumindo a situação atual.
    3. 'insights': 3 pontos curtos e diretos (bullet points) sobre padrões encontrados.
    4. 'recommendation': Uma única ação prática e imediata para melhorar o cenário.
    5. 'detailedReasoning': Uma explicação mais profunda (2 parágrafos) justificando o status e a recomendação, para quem quiser ler mais.
  `;

  try {
    // Using gemini-3-flash-preview for text analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: aiResponseSchema
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Error fetching Gemini analysis:", error);
    return null;
  }
};

export const analyzeReport = async (
  reportContext: string,
  reportType: 'DRE' | 'CATEGORY' | 'GENERAL'
): Promise<AIAnalysisResult | null> => {
    
    let role = "Consultor Financeiro";
    let goal = "analisar o relatório financeiro";

    if (reportType === 'DRE') {
        role = "Controller Financeiro Sênior";
        goal = "analisar a eficiência operacional, margens e resultados do DRE";
    } else if (reportType === 'CATEGORY') {
        role = "Especialista em Gestão de Custos";
        goal = "identificar gargalos de gastos e oportunidades de economia por categoria";
    }

    const prompt = `
      Atue como um ${role}.
      Seu objetivo é ${goal} fornecido abaixo.

      DADOS DO RELATÓRIO:
      ${reportContext}

      Regras de Retorno (JSON):
      1. 'status': Classifique a saúde dos números apresentados (HEALTHY/WARNING/CRITICAL).
      2. 'summary': Resumo executivo em 1 frase.
      3. 'insights': 3 observações críticas (positivas ou negativas).
      4. 'recommendation': A melhor ação corretiva ou de otimização baseada nestes números.
      5. 'detailedReasoning': Explicação técnica mas acessível (2 parágrafos) expandindo a análise.
    `;

    try {
        // Using gemini-3-flash-preview for text analysis tasks
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: aiResponseSchema
          }
        });
    
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text) as AIAnalysisResult;
      } catch (error) {
        console.error("Error fetching Gemini report analysis:", error);
        return null;
      }
};

export const generateChartOfAccounts = async (
  accountType: AccountType,
  activityDescription: string,
  detailLevel: 'SIMPLE' | 'DETAILED'
): Promise<any[]> => {
  
  const dreExplanation = accountType === 'BUSINESS' ? `
    Para EMPRESAS, é OBRIGATÓRIO preencher o campo 'dreCategory' seguindo estritamente estas regras:
    - Vendas/Serviços -> 'DRE_GROSS_REVENUE'
    - Impostos (DAS, ISS) -> 'DRE_TAXES'
    - Custo direto (Matéria prima, comissão paga) -> 'DRE_COSTS'
    - Pro-labore, Salários -> 'DRE_EXPENSE_PERSONNEL'
    - Marketing, Viagens, Combustível -> 'DRE_EXPENSE_COMMERCIAL'
    - Aluguel, Contador, Software, Energia -> 'DRE_EXPENSE_ADMIN'
    - Tarifas bancárias, Juros -> 'DRE_FINANCIAL_EXPENSE'
    - Rendimentos de aplicações -> 'DRE_FINANCIAL_INCOME'
  ` : `
    Para PESSOAL, use 'dreCategory' apenas se fizer sentido (ex: Salário -> GROSS_REVENUE, Juros -> FINANCIAL_EXPENSE), caso contrário deixe null.
  `;

  const prompt = `
    Você é um contador sênior criando um Plano de Contas para ${accountType === 'BUSINESS' ? 'uma Empresa (PJ)' : 'uma Pessoa Física'}.
    
    Atividade: "${activityDescription}".
    Nível de Detalhe: "${detailLevel === 'SIMPLE' ? 'Enxuto (Apenas essenciais)' : 'Detalhado (Bem granular)'}".

    Gere uma estrutura de categorias JSON. Separe estritamente em 'INCOME' (Receitas) e 'EXPENSE' (Despesas).
    
    ${dreExplanation}
    
    Regras de Retorno:
    1. Use cores variadas do Tailwind (blue, green, red, orange, purple, gray, yellow, emerald, indigo, pink).
    2. Retorne APENAS um JSON array.
    3. Crie subcategorias lógicas (ex: Transporte -> Combustível, Transporte -> Manutenção).
  `;

  try {
    // Using gemini-3-flash-preview for text generation tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
              color: { type: Type.STRING },
              dreCategory: { type: Type.STRING, nullable: true },
              subcategories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                    color: { type: Type.STRING },
                    dreCategory: { type: Type.STRING, nullable: true },
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating chart of accounts:", error);
    throw new Error("Falha ao gerar plano de contas via IA.");
  }
};
