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
        const provider = config.get<string>('provider') as AIProvider || AIProvider.Deepseek;
        
        const apiKeyMap = {
            [AIProvider.Deepseek]: config.get<string>('deepseekApiKey'),
            [AIProvider.OpenAI]: config.get<string>('openaiApiKey'),
            [AIProvider.Claude]: config.get<string>('claudeApiKey'),
        };

        const modelMap = {
            [AIProvider.Deepseek]: config.get<string>('deepseekModel') || 'deepseek-chat',
            [AIProvider.OpenAI]: config.get<string>('openaiModel') || 'gpt-4',
            [AIProvider.Claude]: config.get<string>('claudeModel') || 'claude-3-opus-20240229',
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
            vscode.window.showErrorMessage(
                `API key for ${config.provider} is not configured.`, 
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        `ai2sql.${config.provider}ApiKey`
                    );
                }
            });
            throw new Error(`Please configure the API key in settings (ai2sql.${config.provider}ApiKey)`);
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