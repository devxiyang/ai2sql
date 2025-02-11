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
        console.log('Getting service for provider:', config.provider);
        
        if (!config.apiKey) {
            console.error('API key is missing for provider:', config.provider);
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

        if (!config.model) {
            console.error('Model is missing for provider:', config.provider);
            throw new Error(`Model configuration is missing for ${config.provider}`);
        }

        let service = this.services.get(config.provider);
        if (!service) {
            console.log('Creating new service instance for provider:', config.provider);
            const providerConfig = AI_PROVIDER_CONFIG[config.provider];
            if (!providerConfig) {
                console.error('Provider configuration not found:', config.provider);
                throw new Error(`Configuration not found for provider: ${config.provider}`);
            }

            console.log('Service configuration:', {
                provider: config.provider,
                model: config.model,
                baseURL: providerConfig.baseURL,
                apiKeyLength: config.apiKey.length
            });

            try {
                service = new UnifiedAIService({
                    apiKey: config.apiKey,
                    model: config.model,
                    baseURL: providerConfig.baseURL
                });
                this.services.set(config.provider, service);
                console.log('Service instance created successfully');
            } catch (error) {
                console.error('Error creating service instance:', error);
                throw error;
            }
        } else {
            console.log('Reusing existing service instance for provider:', config.provider);
        }

        return service;
    }
} 