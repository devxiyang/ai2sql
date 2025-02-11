import * as vscode from 'vscode';

interface OpenAIError {
    error?: {
        message: string;
    };
}

interface OpenAIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export class OpenAIService {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4') {
        this.apiKey = apiKey;
        this.model = model;
    }

    private async makeRequest(messages: any[]): Promise<string> {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2000,
                })
            });

            if (!response.ok) {
                const error = await response.json() as OpenAIError;
                throw new Error(error.error?.message || 'Failed to get response from OpenAI');
            }

            const data = await response.json() as OpenAIResponse;
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
        }
    }

    public async generateSQL(prompt: string): Promise<string> {
        const messages = [
            {
                role: "system",
                content: `You are an expert SQL developer. Your task is to convert natural language queries into SQL queries.
                Follow these rules:
                1. Generate only the SQL query without any explanations
                2. Use standard SQL syntax that works with most databases
                3. Use appropriate table and column names based on the context
                4. Add appropriate joins when needed
                5. Include WHERE clauses for filtering when appropriate
                6. Use proper SQL formatting for readability`
            },
            {
                role: "user",
                content: prompt
            }
        ];

        return this.makeRequest(messages);
    }

    public async optimizeSQL(sql: string): Promise<string> {
        const messages = [
            {
                role: "system",
                content: `You are an expert SQL performance tuner. Your task is to optimize SQL queries for better performance.
                Follow these rules:
                1. Return only the optimized SQL query without explanations
                2. Add appropriate indexes when needed (as separate CREATE INDEX statements)
                3. Optimize JOIN operations
                4. Avoid SELECT *
                5. Use appropriate WHERE clauses
                6. Consider query execution plan
                7. Use proper SQL formatting for readability`
            },
            {
                role: "user",
                content: `Optimize this SQL query:\n${sql}`
            }
        ];

        return this.makeRequest(messages);
    }
} 