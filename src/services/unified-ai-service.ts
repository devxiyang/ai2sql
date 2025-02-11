import OpenAI from 'openai';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;

    constructor(config: BaseAIServiceConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL
        });
        this.model = config.model;
        console.log('AI service initialized with model:', this.model);
    }

    async generateSQL(prompt: string): Promise<string> {
        console.log('Generating SQL with prompt:', prompt);
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a SQL expert. Convert natural language to SQL queries. Only respond with the SQL query, no explanations."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
            });

            const sql = completion.choices[0]?.message?.content;
            if (!sql) {
                throw new Error('No SQL generated');
            }

            console.log('Generated SQL:', sql);
            return sql;
        } catch (error) {
            console.error('Error generating SQL:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to generate SQL');
        }
    }

    async optimizeSQL(sql: string): Promise<string> {
        console.log('Optimizing SQL:', sql);
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a SQL optimization expert. Optimize the given SQL query for better performance. Only respond with the optimized SQL query, no explanations."
                    },
                    {
                        role: "user",
                        content: `Optimize this SQL query: ${sql}`
                    }
                ],
                temperature: 0.3,
            });

            const optimizedSql = completion.choices[0]?.message?.content;
            if (!optimizedSql) {
                throw new Error('No optimized SQL generated');
            }

            console.log('Optimized SQL:', optimizedSql);
            return optimizedSql;
        } catch (error) {
            console.error('Error optimizing SQL:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to optimize SQL');
        }
    }
} 