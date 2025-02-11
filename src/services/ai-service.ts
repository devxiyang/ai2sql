import { BaseAIService } from './base-ai-service';
import { AIServiceFactory } from './ai-service-factory';

export class AIService {
    private service: BaseAIService;

    constructor() {
        this.service = AIServiceFactory.getInstance().getService();
    }

    public async generateSQL(prompt: string, onStream?: (chunk: string) => void): Promise<string> {
        if (!prompt) {
            throw new Error('Prompt cannot be empty');
        }
        return this.service.generateSQL(prompt, onStream);
    }

    public async optimizeSQL(sql: string, onStream?: (chunk: string) => void): Promise<string> {
        if (!sql) {
            throw new Error('SQL query cannot be empty');
        }
        return this.service.optimizeSQL(sql, onStream);
    }

    public static getConfiguration() {
        return AIServiceFactory.getConfiguration();
    }
} 