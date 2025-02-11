import { BaseAIService } from './base-ai-service';
import { AIServiceFactory } from './ai-service-factory';

export class AIService {
    private service: BaseAIService;

    constructor() {
        this.service = AIServiceFactory.getInstance().getService();
    }

    public async generateSQL(
        prompt: string,
        onStream?: (chunk: string) => void,
        chatHistory?: { content: string; isUser: boolean }[]
    ): Promise<string> {
        if (!prompt) {
            throw new Error('Prompt cannot be empty');
        }
        return this.service.generateSQL(prompt, onStream, chatHistory);
    }

    public async optimizeSQL(
        sql: string,
        onStream?: (chunk: string) => void,
        chatHistory?: { content: string; isUser: boolean }[]
    ): Promise<string> {
        if (!sql) {
            throw new Error('SQL query cannot be empty');
        }
        return this.service.optimizeSQL(sql, onStream, chatHistory);
    }

    public static getConfiguration() {
        return AIServiceFactory.getConfiguration();
    }
} 