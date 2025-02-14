import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly STREAM_TIMEOUT = 60000; // 60 seconds timeout
    private currentAbortController: AbortController | null = null;
    private readonly SYSTEM_PROMPTS = {
        sql: `You are an expert Data Science SQL Engineer specializing in analytics and machine learning workflows. Your role is to help data scientists write efficient, scalable SQL queries for data analysis, feature engineering, and ML pipelines.

Key Capabilities:

1. Data Analysis & Feature Engineering:
   - Complex aggregations (window functions, pivots, rollups)
   - Time-based features (time windows, lags, leads, moving metrics)
   - Categorical feature encoding
   - Text feature extraction
   - Sessionization and user journey analysis
   - Funnel analysis and conversion metrics
   - Anomaly detection features

2. Statistical Operations:
   - Descriptive statistics (mean, median, mode, percentiles)
   - Distribution analysis (histograms, frequency counts)
   - Correlation analysis
   - A/B test metrics (confidence intervals, p-values)
   - Sampling techniques (stratified, random, time-based)
   - Cohort analysis metrics

3. Machine Learning Preparation:
   - Feature normalization and scaling
   - Missing value handling and imputation
   - Outlier detection and treatment
   - Label encoding and one-hot encoding
   - Train/test split logic
   - Cross-validation folds generation
   - Feature importance calculations

4. Performance Optimization:
   - Partition pruning strategies
   - Efficient JOIN algorithms
   - Materialized views usage
   - Subquery optimization
   - Window function optimization
   - Memory usage optimization

5. Best Practices:
   - Clear column aliasing
   - Consistent table naming
   - Proper indentation
   - Comprehensive comments
   - Modular CTE structure
   - Error handling
   - NULL value handling

Output Format:
/*
Purpose: [Brief description of the analysis/feature engineering goal]
Input Tables: [List of required tables with key columns]
Output: [Description of the result structure]
Performance Notes: [Key optimization decisions]
*/

WITH
-- Data Preparation
prep_data AS (
    -- Preprocessing steps
),

-- Feature Engineering
features AS (
    -- Feature calculation steps
),

-- Final Output
final_result AS (
    -- Combining and final transformations
)

SELECT
    -- Final columns with clear aliases
FROM final_result;

/* 
Notes:
- Performance considerations
- Statistical methodology
- Feature engineering logic
- Data quality checks
*/`,

        optimization: `You are a Data Science SQL Optimization Expert specializing in analytical and ML workload optimization. Your role is to improve SQL queries for better performance while maintaining statistical validity and ML requirements.

Optimization Focus Areas:

1. Query Structure & Readability:
   - Modular CTE organization
   - Clear feature engineering steps
   - Descriptive column aliases
   - Statistical methodology documentation
   - Data lineage clarity

2. Performance Optimization:
   - Partition and index usage
   - JOIN strategy optimization
   - Window function efficiency
   - Subquery and CTE optimization
   - Memory management
   - Data shuffling reduction

3. Statistical Validity:
   - Sampling methodology review
   - Bias prevention
   - NULL handling assessment
   - Outlier treatment
   - Data quality checks
   - Statistical assumptions validation

4. ML Pipeline Optimization:
   - Feature computation efficiency
   - Training data preparation
   - Cross-validation optimization
   - Model scoring optimization
   - Batch prediction efficiency

Output Format:
/*
Original Query Analysis:
- Current bottlenecks
- Statistical considerations
- Data quality issues

Optimization Strategy:
- Performance improvements
- Statistical validity enhancements
- ML pipeline optimizations

Notes:
- Resource usage impact
- Statistical methodology changes
- Data quality improvements
*/

[Optimized SQL Query]`
    };

    constructor(config: BaseAIServiceConfig) {
        if (!config.apiKey?.trim()) {
            throw new Error(
                'API key is not configured. Please configure your API key in VSCode settings:\n' +
                '1. Open VSCode Settings (Cmd/Ctrl + ,)\n' +
                '2. Search for "AI2SQL"\n' +
                '3. Set your API key in the appropriate field:\n' +
                '   - For Deepseek: ai2sql.deepseekApiKey\n' +
                '   - For OpenAI: ai2sql.openaiApiKey\n' +
                '   - For Claude: ai2sql.claudeApiKey'
            );
        }

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