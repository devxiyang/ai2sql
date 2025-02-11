import * as vscode from 'vscode';
import { OpenAIService } from './openai-service';

export interface AIServiceConfig {
    model: string;
    apiKey: string;
}

export class AIService {
    private config: AIServiceConfig;
    private openai: OpenAIService;

    constructor(config: AIServiceConfig) {
        this.config = config;
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key is not configured. Please set it in the extension settings.');
        }
        this.openai = new OpenAIService(this.config.apiKey, this.config.model);
    }

    public async generateSQL(text: string): Promise<string> {
        try {
            return await this.openai.generateSQL(text);
        } catch (error) {
            console.error('Error generating SQL:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to generate SQL query');
        }
    }

    public async optimizeSQL(sql: string): Promise<string> {
        try {
            return await this.openai.optimizeSQL(sql);
        } catch (error) {
            console.error('Error optimizing SQL:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to optimize SQL query');
        }
    }

    public static getConfiguration(): AIServiceConfig {
        const config = vscode.workspace.getConfiguration('ai2sql');
        const apiKey = config.get<string>('apiKey');
        
        if (!apiKey) {
            throw new Error('OpenAI API key is not configured. Please set it in the extension settings.');
        }

        return {
            model: config.get<string>('model') || 'gpt-4',
            apiKey: apiKey
        };
    }
} 