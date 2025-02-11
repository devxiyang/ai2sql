import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly MAX_HISTORY_MESSAGES = 10;  // Maximum number of history messages to include
    private readonly MAX_HISTORY_TOKENS = 2000;  // Maximum tokens for history messages

    constructor(config: BaseAIServiceConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL
        });
        this.model = config.model;
        console.log('AI service initialized with model:', this.model);
    }

    private formatChatHistory(messages: { content: string; isUser: boolean }[]): ChatCompletionMessageParam[] {
        // Take only the last MAX_HISTORY_MESSAGES messages
        const recentMessages = messages.slice(-this.MAX_HISTORY_MESSAGES);
        
        // Convert messages to OpenAI format
        const formattedMessages = recentMessages.map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.content
        }));

        // Estimate token count (rough estimation: 4 chars ≈ 1 token)
        let totalLength = formattedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
        const estimatedTokens = Math.ceil(totalLength / 4);
        
        // If history tokens exceed our limit, remove older messages
        while (estimatedTokens > this.MAX_HISTORY_TOKENS && formattedMessages.length > 1) {
            // Always keep the most recent user message
            if (formattedMessages.length === 1 && formattedMessages[0].role === 'user') {
                break;
            }
            // Remove the oldest message
            formattedMessages.shift();
            // Recalculate total length
            totalLength = formattedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
        }

        return formattedMessages;
    }

    async generateSQL(prompt: string, onStream?: (chunk: string) => void, chatHistory: { content: string; isUser: boolean }[] = []): Promise<string> {
        console.log('Generating SQL with prompt:', prompt);
        console.log('Chat history length:', chatHistory.length);
        
        try {
            const formattedHistory = this.formatChatHistory(chatHistory);
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: `You are a SQL expert. Convert natural language to SQL queries.
Format the SQL query with the following rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses
6. Output ONLY the raw SQL query without any markdown formatting, explanations, or code blocks
7. Do not use \`\`\` or any other markdown syntax

Example output:
SELECT
  column1,
  column2,
  column3
FROM
  table_name
WHERE
  condition1 = value1
  AND condition2 IN (
    SELECT column
    FROM another_table
    WHERE x = y
  )
GROUP BY
  column1
ORDER BY
  column2 DESC;`
                },
                ...formattedHistory,
                {
                    role: 'user',
                    content: prompt
                }
            ];

            if (onStream) {
                let stream;
                try {
                    stream = await this.client.chat.completions.create({
                        model: this.model,
                        messages,
                        temperature: 0.7,
                        stream: true,
                    });
                } catch (createError) {
                    console.error('Error creating stream:', createError);
                    throw createError;
                }

                let fullResponse = '';
                let lastChunkTime = Date.now();
                const timeoutDuration = 30000; // 30 seconds timeout
                
                try {
                    for await (const chunk of stream) {
                        const currentTime = Date.now();
                        if (currentTime - lastChunkTime > timeoutDuration) {
                            throw new Error('Stream timeout: No response received for 30 seconds');
                        }
                        lastChunkTime = currentTime;
                        
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            try {
                                onStream(fullResponse);
                            } catch (callbackError) {
                                console.error('Error in stream callback:', callbackError);
                                throw callbackError;
                            }
                        }
                    }
                    
                    if (!fullResponse) {
                        const defaultSQL = 'SELECT\n  *\nFROM\n  example_table\nLIMIT 10;';
                        console.log('No content generated, using default SQL');
                        if (onStream) {
                            onStream(defaultSQL);
                        }
                        return defaultSQL;
                    }
                    
                    return fullResponse;
                } catch (streamError) {
                    console.error('Error processing stream:', streamError);
                    throw streamError;
                }
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    temperature: 0.7,
                });

                const sql = completion.choices[0]?.message?.content;
                if (!sql) {
                    throw new Error('No SQL generated');
                }
                return sql;
            }
        } catch (error) {
            console.error('Error generating SQL:', error);
            throw error instanceof Error ? error : new Error('Failed to generate SQL');
        }
    }

    async optimizeSQL(sql: string, onStream?: (chunk: string) => void): Promise<string> {
        console.log('Optimizing SQL:', sql);
        try {
            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: `You are a SQL optimization expert. Optimize the given SQL query for better performance.
Format the optimized SQL query with the following rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses
6. Add comments to explain major optimization changes
7. Only output the optimized SQL query with comments, no other explanations

Example format:
-- Optimized query: Added index hint and reordered joins
SELECT
  t1.column1,
  t2.column2
FROM
  table1 t1
  USE INDEX (idx_column1)
  INNER JOIN table2 t2
    ON t1.id = t2.id
WHERE
  t1.column1 > 100
  AND t2.column2 IN (
    SELECT column2
    FROM table3
    WHERE status = 'active'
  );`
                        },
                        {
                            role: "user",
                            content: `Optimize this SQL query: ${sql}`
                        }
                    ],
                    temperature: 0.3,
                    stream: true,
                });

                let fullResponse = '';
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    fullResponse += content;
                    onStream(fullResponse);
                }
                return fullResponse;
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: `You are a SQL optimization expert. Optimize the given SQL query for better performance.
Format the optimized SQL query with the following rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses
6. Add comments to explain major optimization changes
7. Only output the optimized SQL query with comments, no other explanations

Example format:
-- Optimized query: Added index hint and reordered joins
SELECT
  t1.column1,
  t2.column2
FROM
  table1 t1
  USE INDEX (idx_column1)
  INNER JOIN table2 t2
    ON t1.id = t2.id
WHERE
  t1.column1 > 100
  AND t2.column2 IN (
    SELECT column2
    FROM table3
    WHERE status = 'active'
  );`
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
                return optimizedSql;
            }
        } catch (error) {
            console.error('Error optimizing SQL:', error);
            throw error instanceof Error ? error : new Error('Failed to optimize SQL');
        }
    }
} 