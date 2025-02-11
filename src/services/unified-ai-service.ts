import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

interface ChatHistoryMessage {
    content: string;
    isUser: boolean;
}

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly MAX_HISTORY_MESSAGES = 10;  // Maximum number of history messages to include
    private readonly MAX_HISTORY_TOKENS = 2000;  // Maximum tokens for history messages
    private readonly STREAM_TIMEOUT = 1800000;   // 30 minutes timeout for streaming (Deepseek max)
    private readonly INITIAL_CHUNK_TIMEOUT = 120000;  // 2 minutes timeout for first chunk
    private readonly CHUNK_TIMEOUT = 30000;      // 30 seconds timeout for subsequent chunks
    private readonly RETRY_COUNT = 3;            // Number of retries for failed requests
    private readonly SUMMARY_THRESHOLD = 6;      // Number of messages before summarizing

    constructor(config: BaseAIServiceConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            timeout: this.STREAM_TIMEOUT,
            maxRetries: this.RETRY_COUNT,
        });
        this.model = config.model;
        console.log('AI service initialized with model:', this.model);
    }

    private async summarizeChatHistory(messages: ChatHistoryMessage[]): Promise<ChatCompletionMessageParam[]> {
        if (messages.length <= this.SUMMARY_THRESHOLD) {
            return messages.map(msg => ({
                role: msg.isUser ? 'user' as const : 'assistant' as const,
                content: msg.content || ''
            }));
        }

        // Keep the most recent messages as is
        const recentMessages = messages.slice(-2);
        const messagesToSummarize = messages.slice(0, -2);

        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a SQL conversation summarizer. Summarize the conversation history while preserving:
1. Important table names and their relationships
2. Key business requirements
3. Any specific SQL patterns or preferences mentioned
4. Critical constraints or conditions

Keep the summary concise but informative. Format in Markdown with bullet points.`
                    },
                    ...messagesToSummarize.map(msg => ({
                        role: msg.isUser ? 'user' as const : 'assistant' as const,
                        content: msg.content || ''
                    }))
                ],
                temperature: 0.3,
            });

            const summary = completion.choices[0]?.message?.content || '';
            if (!summary) {
                console.warn('Failed to generate summary, falling back to recent messages only');
                return recentMessages.map(msg => ({
                    role: msg.isUser ? 'user' as const : 'assistant' as const,
                    content: msg.content || ''
                }));
            }

            // Return the summary as an assistant message, followed by the recent messages
            return [
                {
                    role: 'assistant',
                    content: `Previous conversation summary:\n${summary}`
                },
                ...recentMessages.map(msg => ({
                    role: msg.isUser ? 'user' as const : 'assistant' as const,
                    content: msg.content || ''
                }))
            ];
        } catch (error) {
            console.warn('Error summarizing chat history:', error);
            // Fallback: keep only recent messages
            return recentMessages.map(msg => ({
                role: msg.isUser ? 'user' as const : 'assistant' as const,
                content: msg.content || ''
            }));
        }
    }

    private async formatChatHistory(messages: ChatHistoryMessage[]): Promise<ChatCompletionMessageParam[]> {
        // Take only the last MAX_HISTORY_MESSAGES messages
        const recentMessages = messages.slice(-this.MAX_HISTORY_MESSAGES);
        
        // Get summarized messages
        const formattedMessages = await this.summarizeChatHistory(recentMessages);
        
        // Estimate token count (rough estimation: 4 chars ≈ 1 token)
        let totalLength = formattedMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
        const estimatedTokens = Math.ceil(totalLength / 4);
        
        // If still too long, remove older messages but keep the summary
        while (estimatedTokens > this.MAX_HISTORY_TOKENS && formattedMessages.length > 2) {
            // Always keep the summary and the most recent user message
            if (formattedMessages.length === 2 && formattedMessages[1].role === 'user') {
                break;
            }
            // Remove the oldest message after summary
            formattedMessages.splice(1, 1);
            // Recalculate total length
            totalLength = formattedMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
        }

        return formattedMessages;
    }

    private async handleStream(
        stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
        onStream: (chunk: string) => void
    ): Promise<string> {
        let fullResponse = '';
        let lastChunkTime = Date.now();
        let isFirstChunk = true;
        
        try {
            for await (const chunk of stream) {
                const currentTime = Date.now();
                const timeoutLimit = isFirstChunk ? this.INITIAL_CHUNK_TIMEOUT : this.CHUNK_TIMEOUT;
                
                // Check for timeout
                if (currentTime - lastChunkTime > timeoutLimit) {
                    if (fullResponse.trim()) {
                        console.log('Returning partial response due to timeout');
                        return fullResponse;
                    }
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
                    lastChunkTime = currentTime;
                }
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

    async generateSQL(
        prompt: string,
        onStream?: (chunk: string) => void,
        chatHistory: ChatHistoryMessage[] = []
    ): Promise<string> {
        console.log('Generating SQL with prompt:', prompt);
        console.log('Chat history length:', chatHistory.length);
        
        try {
            const formattedHistory = await this.formatChatHistory(chatHistory);
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
                    content: prompt || ''
                }
            ];

            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    stream: true,
                    temperature: 0.3,
                });

                return this.handleStream(stream, onStream);
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    temperature: 0.3,
                });

                const sql = completion.choices[0]?.message?.content || '';
                if (!sql) {
                    throw new Error('No SQL generated');
                }

                return sql;
            }
        } catch (error) {
            console.error('Error generating SQL:', error);
            throw error;
        }
    }

    async optimizeSQL(
        sql: string,
        onStream?: (chunk: string) => void
    ): Promise<string> {
        console.log('Optimizing SQL:', sql);
        
        try {
            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a SQL optimization expert. Analyze and optimize SQL queries for better performance.
Focus on:
1. Proper indexing suggestions
2. Query structure improvements
3. Performance bottlenecks
4. Alternative approaches if applicable

Format your response in Markdown:
- Use **bold** for emphasis
- Use \`code\` for SQL code, table names, column names
- Use bullet points for lists
- Use > for important notes
- Use --- for separating sections

Start with the optimized SQL query, then explain the changes and why they improve performance.`
                        },
                        {
                            role: 'user',
                            content: sql
                        }
                    ],
                    stream: true,
                    temperature: 0.3,
                });

                return this.handleStream(stream, onStream);
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a SQL optimization expert. Analyze and optimize SQL queries for better performance.
Focus on:
1. Proper indexing suggestions
2. Query structure improvements
3. Performance bottlenecks
4. Alternative approaches if applicable

Format your response in Markdown:
- Use **bold** for emphasis
- Use \`code\` for SQL code, table names, column names
- Use bullet points for lists
- Use > for important notes
- Use --- for separating sections

Start with the optimized SQL query, then explain the changes and why they improve performance.`
                        },
                        {
                            role: 'user',
                            content: sql
                        }
                    ],
                    temperature: 0.3,
                });

                const optimizedSql = completion.choices[0]?.message?.content || '';
                if (!optimizedSql) {
                    throw new Error('No optimization suggestions generated');
                }

                return optimizedSql;
            }
        } catch (error) {
            console.error('Error optimizing SQL:', error);
            throw error;
        }
    }
} 