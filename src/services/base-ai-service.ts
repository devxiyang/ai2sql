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
    Deepseek = 'deepseek',
    OpenAI = 'openai',
    Claude = 'claude'
}

export const AI_PROVIDER_CONFIG = {
    [AIProvider.Deepseek]: {
        baseURL: 'https://api.deepseek.com',
    },
    [AIProvider.OpenAI]: {
        baseURL: 'https://api.openai.com/v1',
    },
    [AIProvider.Claude]: {
        baseURL: 'https://api.anthropic.com/v1',
    }
};

export interface AIModelConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
} 