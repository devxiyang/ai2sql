import OpenAI from 'openai';

export interface BaseAIServiceConfig {
    apiKey: string;
    model: string;
    baseURL?: string;
}

export interface BaseAIService {
    generateSQL(prompt: string): Promise<string>;
    optimizeSQL(sql: string): Promise<string>;
}

export enum AIProvider {
    OpenAI = 'openai',
    Claude = 'claude',
    Deepseek = 'deepseek'
}

export const AI_PROVIDER_CONFIG = {
    [AIProvider.OpenAI]: {
        baseURL: 'https://api.openai.com/v1',
    },
    [AIProvider.Claude]: {
        baseURL: 'https://api.anthropic.com/v1',
    },
    [AIProvider.Deepseek]: {
        baseURL: 'https://api.deepseek.com/v1',
    }
};

export interface AIModelConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
} 