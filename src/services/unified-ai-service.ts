import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

interface ChatHistoryMessage {
    content: string;
    isUser: boolean;
}

interface ChatSummaryCache {
    summary: string;
    messageCount: number;
    totalLength: number;
}

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private summaryCache: ChatSummaryCache | null = null;
    private readonly MAX_CONTEXT_CHARS = 64 * 1024;  // 64k context window
    private readonly CONTEXT_THRESHOLD = 0.7;  // Start summarizing at 70% of max context
    private readonly MAX_HISTORY_MESSAGES = 50;  // Maximum number of messages to keep
    private readonly STREAM_TIMEOUT = 3600000;   // 60 minutes timeout for streaming
    private readonly INITIAL_CHUNK_TIMEOUT = 300000;  // 5 minutes timeout for first chunk
    private readonly CHUNK_TIMEOUT = 60000;      // 60 seconds timeout for subsequent chunks

    constructor(config: BaseAIServiceConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            timeout: this.STREAM_TIMEOUT,
            maxRetries: 0,  // Disable retries
        });
        this.model = config.model;
        console.log('AI service initialized with model:', this.model);
    }

    private async summarizeHistory(messages: ChatHistoryMessage[]): Promise<string> {
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
                    ...messages.map(msg => ({
                        role: msg.isUser ? 'user' as const : 'assistant' as const,
                        content: msg.content || ''
                    }))
                ],
                temperature: 0.3,
            });

            const summary = completion.choices[0]?.message?.content || '';
            if (!summary) {
                throw new Error('Failed to generate summary');
            }

            return `Previous conversation summary:\n${summary}`;
        } catch (error) {
            console.error('Error generating summary:', error);
            throw error;
        }
    }

    private calculateTotalLength(messages: ChatCompletionMessageParam[]): number {
        return messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    }

    private async formatChatHistory(messages: ChatHistoryMessage[]): Promise<ChatCompletionMessageParam[]> {
        // Take only the last MAX_HISTORY_MESSAGES messages
        const recentMessages = messages.slice(-this.MAX_HISTORY_MESSAGES);
        
        // Convert messages to ChatCompletionMessageParam format
        const formattedMessages = recentMessages.map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.content || ''
        }));

        // Calculate total length
        const totalLength = this.calculateTotalLength(formattedMessages);
        const thresholdLength = this.MAX_CONTEXT_CHARS * this.CONTEXT_THRESHOLD;

        // If we're under the threshold, return as is
        if (totalLength <= thresholdLength) {
            console.log(`Using full history (${totalLength} chars)`);
            return formattedMessages;
        }

        // If we have a cached summary and it's still valid
        if (this.summaryCache && 
            this.summaryCache.messageCount === messages.length - 1 && 
            this.summaryCache.totalLength === totalLength) {
            console.log('Using cached summary');
            return [
                {
                    role: 'assistant',
                    content: this.summaryCache.summary
                },
                formattedMessages[formattedMessages.length - 1] // Add the latest message
            ];
        }

        try {
            // Generate new summary
            console.log(`Generating new summary for ${formattedMessages.length} messages`);
            const summary = await this.summarizeHistory(recentMessages.slice(0, -1));
            
            // Cache the summary
            this.summaryCache = {
                summary,
                messageCount: messages.length - 1,
                totalLength
            };

            // Return summary + latest message
            return [
                {
                    role: 'assistant',
                    content: summary
                },
                formattedMessages[formattedMessages.length - 1] // Add the latest message
            ];
        } catch (error) {
            console.warn('Error summarizing history, falling back to recent messages:', error);
            // If summarization fails, take the most recent messages that fit within threshold
            let truncatedMessages = [];
            let currentLength = 0;
            
            for (let i = formattedMessages.length - 1; i >= 0; i--) {
                const messageLength = formattedMessages[i].content?.length || 0;
                if (currentLength + messageLength > thresholdLength) {
                    break;
                }
                truncatedMessages.unshift(formattedMessages[i]);
                currentLength += messageLength;
            }

            console.log(`Falling back to ${truncatedMessages.length} recent messages`);
            return truncatedMessages;
        }
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
        
        if (!prompt || !prompt.trim()) {
            throw new Error('Prompt cannot be empty');
        }
        
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
                    content: prompt.trim()
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
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error('Failed to generate SQL');
            }
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