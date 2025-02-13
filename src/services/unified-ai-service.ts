import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly MAX_TOKENS = 4000;
    private readonly STREAM_TIMEOUT = 60000; // 60 seconds timeout
    private readonly SYSTEM_PROMPTS = {
        sql: `You are a SQL expert. Convert natural language to SQL queries.
Follow these rules:
1. Use UPPERCASE for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause starts on a new line with proper indentation
3. Place each column/condition on a new line when there are multiple
4. Add appropriate spacing around operators
5. Output the raw SQL query without markdown formatting
6. Include helpful comments for complex parts
7. Ensure the query is properly formatted and readable`,
        
        optimization: `You are a SQL optimization expert. Analyze and optimize SQL queries.
Focus on:
1. Proper indexing suggestions
2. Query structure improvements
3. Performance bottlenecks
4. Alternative approaches if applicable

Format your response in Markdown:
- Start with the optimized SQL query
- Then explain the improvements and why they help performance
- Use bullet points for suggestions
- Include specific index recommendations`
    };

    constructor(config: BaseAIServiceConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            timeout: this.STREAM_TIMEOUT,
            maxRetries: 2
        });
        this.model = config.model;
        console.log('UnifiedAIService initialized with model:', this.model);
    }

    private async processStream(
        stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
        onStream: (chunk: string) => void
    ): Promise<string> {
        let fullResponse = '';
        let lastChunkTime = Date.now();

        try {
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    onStream(content);
                    lastChunkTime = Date.now();
                }

                // Check for timeout
                if (Date.now() - lastChunkTime > this.STREAM_TIMEOUT) {
                    throw new Error('Stream timeout: No response received');
                }
            }

            if (!fullResponse.trim()) {
                throw new Error('No content generated');
            }

            return fullResponse;
        } catch (error) {
            console.error('Stream processing error:', error);
            if (fullResponse.trim()) {
                return fullResponse; // Return partial response if available
            }
            throw error;
        }
    }

    private formatMessages(
        systemPrompt: string,
        userPrompt: string,
        chatHistory?: { content: string; isUser: boolean }[]
    ): ChatCompletionMessageParam[] {
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Add recent chat history if available
        if (chatHistory?.length) {
            const recentMessages = chatHistory
                .slice(-3) // Take last 3 messages for context
                .map(msg => ({
                    role: msg.isUser ? 'user' as const : 'assistant' as const,
                    content: msg.content
                }));
            messages.push(...recentMessages);
        }

        // Add current prompt
        messages.push({ role: 'user', content: userPrompt });

        return messages;
    }

    async generateSQL(
        prompt: string,
        onStream?: (chunk: string) => void,
        chatHistory?: { content: string; isUser: boolean }[]
    ): Promise<string> {
        console.log('Generating SQL for prompt:', prompt);

        if (!prompt?.trim()) {
            throw new Error('Empty prompt');
        }

        try {
            const messages = this.formatMessages(
                this.SYSTEM_PROMPTS.sql,
                prompt,
                chatHistory
            );

            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    stream: true,
                    temperature: 0.3,
                    max_tokens: this.MAX_TOKENS
                });

                return this.processStream(stream, onStream);
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    temperature: 0.3,
                    max_tokens: this.MAX_TOKENS
                });

                const sql = completion.choices[0]?.message?.content;
                if (!sql) {
                    throw new Error('No SQL generated');
                }

                return sql;
            }
        } catch (error) {
            console.error('SQL generation error:', error);
            throw error instanceof Error ? error : new Error('Failed to generate SQL');
        }
    }

    async optimizeSQL(
        sql: string,
        onStream?: (chunk: string) => void,
        chatHistory?: { content: string; isUser: boolean }[]
    ): Promise<string> {
        console.log('Optimizing SQL:', sql);

        try {
            const messages = this.formatMessages(this.SYSTEM_PROMPTS.optimization, sql, chatHistory);

            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    stream: true,
                    temperature: 0.3,
                    max_tokens: this.MAX_TOKENS
                });

                return this.processStream(stream, onStream);
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    temperature: 0.3,
                    max_tokens: this.MAX_TOKENS
                });

                const optimized = completion.choices[0]?.message?.content;
                if (!optimized) {
                    throw new Error('No optimization suggestions generated');
                }

                return optimized;
            }
        } catch (error) {
            console.error('SQL optimization error:', error);
            throw error instanceof Error ? error : new Error('Failed to optimize SQL');
        }
    }
}