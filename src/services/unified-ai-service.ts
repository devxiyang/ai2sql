import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly MAX_HISTORY_MESSAGES = 10;  // Maximum number of history messages to include
    private readonly MAX_HISTORY_TOKENS = 2000;  // Maximum tokens for history messages
    private readonly STREAM_TIMEOUT = 60000;     // 60 seconds timeout for streaming
    private readonly INITIAL_CHUNK_TIMEOUT = 30000;  // 30 seconds timeout for first chunk
    private readonly CHUNK_TIMEOUT = 10000;      // 10 seconds timeout for subsequent chunks

    constructor(config: BaseAIServiceConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            timeout: this.STREAM_TIMEOUT,
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

    private async handleStream(stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>, onStream: (chunk: string) => void): Promise<string> {
        let fullResponse = '';
        let lastChunkTime = Date.now();
        let isFirstChunk = true;
        
        try {
            for await (const chunk of stream) {
                const currentTime = Date.now();
                const timeoutLimit = isFirstChunk ? this.INITIAL_CHUNK_TIMEOUT : this.CHUNK_TIMEOUT;
                
                if (currentTime - lastChunkTime > timeoutLimit) {
                    throw new Error(`Stream ${isFirstChunk ? 'initial' : 'chunk'} timeout: No response received for ${timeoutLimit/1000} seconds`);
                }
                
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    if (isFirstChunk) {
                        console.log('Received first chunk after', (currentTime - lastChunkTime)/1000, 'seconds');
                        isFirstChunk = false;
                    }
                    fullResponse += content;
                    try {
                        onStream(fullResponse);
                    } catch (callbackError) {
                        console.error('Error in stream callback:', callbackError);
                    }
                }
                lastChunkTime = currentTime;
            }
            
            if (!fullResponse.trim()) {
                throw new Error('No content generated in stream');
            }
            
            return fullResponse;
        } catch (error) {
            console.error('Error in stream processing:', error);
            if (fullResponse.trim()) {
                console.log('Returning partial response:', fullResponse);
                return fullResponse;
            }
            throw error;
        }
    }

    async generateSQL(prompt: string, onStream?: (chunk: string) => void, chatHistory: { content: string; isUser: boolean }[] = []): Promise<string> {
        console.log('Generating SQL with prompt:', prompt);
        console.log('Chat history length:', chatHistory.length);
        
        try {
            const formattedHistory = this.formatChatHistory(chatHistory);
            console.log('Formatted history length:', formattedHistory.length);
            
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: `You are a SQL expert. Convert natural language to SQL queries.
For SQL queries, follow these rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses
6. Output the raw SQL query directly without any markdown formatting

For explanations or additional information, use Markdown formatting:
- Use **bold** for emphasis
- Use \`code\` for table names, column names, or values
- Use bullet points for lists
- Use > for important notes
- Use --- for separating sections

Example SQL output:
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
  column2 DESC;

Example explanation output:
This query will:
- Join the \`users\` and \`orders\` tables
- Filter by **active** users only
- Sort by order date

> Note: Make sure the indexes exist on join columns`
                },
                ...formattedHistory,
                {
                    role: 'user',
                    content: prompt
                }
            ];

            if (onStream) {
                try {
                    const stream = await this.client.chat.completions.create({
                        model: this.model,
                        messages,
                        temperature: 0.7,
                        stream: true,
                    });
                    
                    return await this.handleStream(stream, onStream);
                } catch (error) {
                    console.error('Error in stream generation:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Failed to generate SQL';
                    const userMessage = errorMessage.includes('timeout') ? 
                        '> **Error**: The request timed out. Please try again.' :
                        '> **Error**: Something went wrong. Please try again.';
                    onStream(userMessage);
                    return userMessage;
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
                try {
                    const stream = await this.client.chat.completions.create({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content: `You are a SQL optimization expert. Optimize the given SQL query for better performance.

For SQL queries, follow these rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses

For optimization explanations, use Markdown formatting:
- Use **bold** for key optimization points
- Use \`code\` for table names, column names, or values
- Use bullet points for listing changes
- Use > for important notes
- Use --- for separating sections

Example output:
> **Key Optimizations Applied**:
- Added index hint on \`customer_id\`
- Reordered joins for better performance
- Added table aliases for readability

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
  );

> Note: Consider adding an index on \`table2.column2\` for better performance`
                            },
                            {
                                role: "user",
                                content: `Optimize this SQL query: ${sql}`
                            }
                        ],
                        temperature: 0.3,
                        stream: true,
                    });
                    
                    return await this.handleStream(stream, onStream);
                } catch (error) {
                    console.error('Error in stream optimization:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Failed to optimize SQL';
                    const userMessage = errorMessage.includes('timeout') ? 
                        '> **Error**: The request timed out. Please try again.' :
                        '> **Error**: Something went wrong. Please try again.';
                    onStream(userMessage);
                    return userMessage;
                }
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: `You are a SQL optimization expert. Optimize the given SQL query for better performance.

For SQL queries, follow these rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses

For optimization explanations, use Markdown formatting:
- Use **bold** for key optimization points
- Use \`code\` for table names, column names, or values
- Use bullet points for listing changes
- Use > for important notes
- Use --- for separating sections

Example output:
> **Key Optimizations Applied**:
- Added index hint on \`customer_id\`
- Reordered joins for better performance
- Added table aliases for readability

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
  );

> Note: Consider adding an index on \`table2.column2\` for better performance`
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