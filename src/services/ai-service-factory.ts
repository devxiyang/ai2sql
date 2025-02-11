import * as vscode from 'vscode';
import { BaseAIService, AIProvider, AIModelConfig, AI_PROVIDER_CONFIG } from './base-ai-service';
import { UnifiedAIService } from './unified-ai-service';

export class AIServiceFactory {
    private static instance: AIServiceFactory;
    private services: Map<AIProvider, BaseAIService> = new Map();

    private constructor() {}

    public static getInstance(): AIServiceFactory {
        if (!AIServiceFactory.instance) {
            AIServiceFactory.instance = new AIServiceFactory();
        }
        return AIServiceFactory.instance;
    }

    public static getConfiguration(): AIModelConfig {
        const config = vscode.workspace.getConfiguration('ai2sql');
        const provider = config.get<string>('provider') as AIProvider || AIProvider.OpenAI;
        
        const apiKeyMap = {
            [AIProvider.OpenAI]: config.get<string>('openaiApiKey'),
            [AIProvider.Claude]: config.get<string>('claudeApiKey'),
            [AIProvider.Deepseek]: config.get<string>('deepseekApiKey'),
        };

        const modelMap = {
            [AIProvider.OpenAI]: config.get<string>('openaiModel') || 'gpt-4',
            [AIProvider.Claude]: config.get<string>('claudeModel') || 'claude-3-opus-20240229',
            [AIProvider.Deepseek]: config.get<string>('deepseekModel') || 'deepseek-chat',
        };

        return {
            provider,
            apiKey: apiKeyMap[provider] || '',
            model: modelMap[provider],
        };
    }

    public getService(): BaseAIService {
        const config = AIServiceFactory.getConfiguration();
        
        if (!config.apiKey) {
            throw new Error(`API key for ${config.provider} is not configured. Please set it in the extension settings.`);
        }

        let service = this.services.get(config.provider);
        if (!service) {
            const providerConfig = AI_PROVIDER_CONFIG[config.provider];
            service = new UnifiedAIService({
                apiKey: config.apiKey,
                model: config.model,
                baseURL: providerConfig.baseURL
            });
            this.services.set(config.provider, service);
        }

        return service;
    }
} 