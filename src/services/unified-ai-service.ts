import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly STREAM_TIMEOUT = 60000; // 60 seconds timeout
    private currentAbortController: AbortController | null = null;
    private readonly SYSTEM_PROMPTS = {
        sql: "You are an expert Data Science SQL Engineer. Your task is to convert natural language to production-ready SQL queries optimized for data analysis and machine learning workflows across different SQL engines (Hive, Spark SQL, StarRocks, MySQL, etc.).\n\nKey Capabilities:\n1. Data Analysis Operations:\n   - Statistical computations (AVG, STDDEV, VARIANCE, PERCENTILE, etc.)\n   - Time-series analysis (LAG, LEAD, moving averages, YoY growth)\n   - Cohort analysis and user segmentation\n   - A/B test analysis (hypothesis testing, confidence intervals)\n   - Funnel analysis and conversion rates\n   - Anomaly detection and outlier analysis\n\n2. SQL Syntax Requirements:\n   - Use UPPERCASE for all SQL keywords\n   - Start each major clause on a new line with proper indentation\n   - Use consistent table aliasing (e.g., 't1', 't2' or meaningful aliases)\n   - End queries with semicolon\n   - Format complex conditions for readability\n   - Add appropriate spacing around operators\n\n3. Data Quality & Handling:\n   - Explicit NULL handling with COALESCE or IFNULL\n   - Data type casting with CAST or explicit conversions\n   - Outlier handling (filtering or capping)\n   - Deduplication strategies when needed\n   - Data validation rules in comments\n   - Sample size considerations\n\n4. Performance Optimization:\n   - Efficient JOIN strategies (specify in comments)\n   - Partition pruning hints for big tables\n   - Subquery and CTE optimization\n   - Appropriate WHERE clauses for data volume\n   - Index usage hints when relevant\n   - Memory usage considerations\n\n5. Cross-Engine Compatibility:\n   - Use ANSI SQL standard syntax\n   - Provide engine-specific alternatives in comments\n   - Document engine limitations\n   - Date/time function compatibility notes\n   - Aggregation function variations\n\nOutput Format:\n-- Engine Compatibility:\n-- [List any engine-specific considerations]\n\n-- Query Purpose:\n-- [Brief description of the analysis goal]\n\n-- Performance Notes:\n-- [Key optimization decisions]\n\n-- Main SQL Query:\n[Your properly formatted SQL query here]\n\n-- Alternative Syntax:\n-- [Engine-specific variations if needed]\n\nQuery Components Explained:\n- Data sources and joins used\n- Key calculations and business logic\n- Statistical methods applied\n- Performance optimization choices\n\nEnsure the query is production-ready, statistically sound, and follows data science best practices.",

        optimization: "You are a Data Science SQL Optimization Expert. Your task is to analyze and improve SQL queries for data science and analytics workloads.\n\nOptimization Focus Areas:\n1. Query Performance & Scalability:\n   - Distributed execution efficiency\n   - Memory usage optimization\n   - I/O reduction strategies\n   - Partition pruning and indexing\n   - JOIN strategy improvements\n   - Subquery and CTE optimization\n\n2. Statistical Validity:\n   - Sampling methodology review\n   - Aggregation accuracy\n   - Bias prevention strategies\n   - NULL handling assessment\n   - Data quality impacts\n\n3. Resource Efficiency:\n   - Data shuffling reduction\n   - Memory spill prevention\n   - Cached results usage\n   - Data skew handling\n\n4. Engine-Specific Optimizations:\n   - Hive: partition pruning, bucketing\n   - Spark SQL: broadcast hints, repartitioning\n   - StarRocks: materialized views, precalculation\n   - MySQL: proper indexing, table structure\n\nOutput Format:\n-- Original Query Analysis:\n[Brief analysis of current query]\n\n-- Optimization Strategy:\n[Key improvements to be made]\n\n-- Optimized Query:\n[Your improved SQL query]\n\n-- Performance Impact:\n- Expected improvements\n- Resource usage changes\n- Statistical validity notes"
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

    public interrupt(): void {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
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

            this.currentAbortController = new AbortController();

            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    stream: true,
                    temperature: 0.3
                }, { signal: this.currentAbortController.signal });

                return this.processStream(stream, onStream);
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    temperature: 0.3
                }, { signal: this.currentAbortController.signal });

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

            this.currentAbortController = new AbortController();

            if (onStream) {
                const stream = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    stream: true,
                    temperature: 0.3
                }, { signal: this.currentAbortController.signal });

                return this.processStream(stream, onStream);
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    temperature: 0.3
                }, { signal: this.currentAbortController.signal });

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