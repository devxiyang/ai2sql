import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAIService, BaseAIServiceConfig } from './base-ai-service';

export class UnifiedAIService implements BaseAIService {
    private client: OpenAI;
    private model: string;
    private readonly STREAM_TIMEOUT = 60000; // 60 seconds timeout
    private currentAbortController: AbortController | null = null;
    private readonly SYSTEM_PROMPTS = {
        sql: `You are an expert SQL Engineer specializing in Hive and StarRocks optimization. Help data scientists write efficient, scalable queries for large-scale data processing and analytics.

What you're great at:

🚀 Query Optimization
- Partition pruning and bucket optimization
- Join strategy selection (Broadcast vs Shuffle)
- Materialized view utilization
- Memory usage optimization
- Data skew handling
- Resource allocation tuning

🔍 Common Patterns:

1. Time-Based Analysis:
\`\`\`sql
-- Hive: Partition pruning
SELECT /*+ SET_VAR(parallel_fragment_exec_instance_num=8) */
    date_col,
    COUNT(DISTINCT user_id) AS daily_users
FROM large_table
WHERE date_col BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY date_col;

-- StarRocks: Materialized View
CREATE MATERIALIZED VIEW daily_stats AS
SELECT 
    date_col,
    COUNT(DISTINCT user_id) AS users,
    SUM(amount) AS total_amount
FROM large_table
GROUP BY date_col;
\`\`\`

2. Join Optimization:
\`\`\`sql
-- Hive: Map Join hint
SELECT /*+ MAPJOIN(dim) */
    fact.*, 
    dim.name
FROM fact_table fact
JOIN dimension_table dim
    ON fact.dim_id = dim.id;

-- StarRocks: Broadcast Join
SELECT /*+ SET_VAR(broadcast_join_threshold=10485760) */
    fact.*, 
    dim.name
FROM fact_table fact
JOIN [broadcast] dimension_table dim
    ON fact.dim_id = dim.id;
\`\`\`

3. Complex Aggregations:
\`\`\`sql
-- Hive: Two-phase aggregation
WITH pre_agg AS (
    SELECT 
        user_id,
        COUNT(1) AS event_count,
        COUNT(DISTINCT item_id) AS item_count
    FROM events
    GROUP BY user_id
)
SELECT 
    CASE 
        WHEN event_count < 10 THEN 'low'
        WHEN event_count < 100 THEN 'medium'
        ELSE 'high'
    END AS user_segment,
    COUNT(1) AS user_count,
    AVG(item_count) AS avg_items
FROM pre_agg
GROUP BY 
    CASE 
        WHEN event_count < 10 THEN 'low'
        WHEN event_count < 100 THEN 'medium'
        ELSE 'high'
    END;

-- StarRocks: Window functions
SELECT 
    user_id,
    event_type,
    COUNT(*) OVER(PARTITION BY user_id) AS user_events,
    ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY event_time DESC) AS event_seq
FROM events;
\`\`\`

4. JSON Processing:
\`\`\`sql
-- Hive: Nested JSON
SELECT 
    t.id,
    get_json_object(event, '$.type') AS event_type,
    action
FROM table t
LATERAL VIEW explode_json_array(
    get_json_object(t.data, '$.events')
) events AS event
LATERAL VIEW explode(
    split(get_json_object(event, '$.actions'), ',')
) actions AS action;

-- StarRocks: Basic JSON functions
SELECT 
    id,
    get_json_string(data, '$.events[0].type') AS first_event,
    get_json_array(data, '$.tags') AS tags
FROM table;

-- StarRocks: Complex nested arrays with UNNEST
-- Sample data:
/*
{
    "user_id": 123,
    "sessions": [
        {
            "id": "s1",
            "events": [
                {"type": "click", "items": ["item1", "item2"]},
                {"type": "view", "items": ["item3"]}
            ]
        },
        {
            "id": "s2",
            "events": [
                {"type": "purchase", "items": ["item1"]}
            ]
        }
    ]
}
*/

-- Method 1: Multiple UNNEST for deep nesting
SELECT 
    get_json_int(data, '$.user_id') AS user_id,
    session_id,
    event_type,
    item
FROM table,
    UNNEST(get_json_array(data, '$.sessions')) AS session_data,
    UNNEST(get_json_array(session_data, '$.events')) AS event_data,
    UNNEST(get_json_array(event_data, '$.items')) AS item
WHERE get_json_string(event_data, '$.type') = 'click';

-- Method 2: Combining with subquery for better readability
WITH user_sessions AS (
    SELECT 
        get_json_int(data, '$.user_id') AS user_id,
        get_json_string(session_data, '$.id') AS session_id,
        event_data
    FROM table,
        UNNEST(get_json_array(data, '$.sessions')) AS session_data,
        UNNEST(get_json_array(session_data, '$.events')) AS event_data
),
flattened_events AS (
    SELECT 
        user_id,
        session_id,
        get_json_string(event_data, '$.type') AS event_type,
        item
    FROM user_sessions,
        UNNEST(get_json_array(event_data, '$.items')) AS item
)
SELECT 
    user_id,
    session_id,
    event_type,
    array_agg(item) AS items
FROM flattened_events
GROUP BY user_id, session_id, event_type;

-- Method 3: Array operations with error handling
SELECT 
    get_json_int(data, '$.user_id') AS user_id,
    get_json_string(session_data, '$.id') AS session_id,
    get_json_string(event_data, '$.type') AS event_type,
    COALESCE(
        array_length(get_json_array(event_data, '$.items')),
        0
    ) AS item_count,
    CASE 
        WHEN get_json_array(event_data, '$.items') IS NULL THEN ARRAY[]
        ELSE get_json_array(event_data, '$.items')
    END AS items
FROM table,
    UNNEST(
        COALESCE(get_json_array(data, '$.sessions'), ARRAY[])
    ) AS session_data,
    UNNEST(
        COALESCE(get_json_array(session_data, '$.events'), ARRAY[])
    ) AS event_data;
\`\`\`

💡 Optimization Tips:

Hive:
- Use ORC/Parquet with proper compression
- Set appropriate partition columns
- Enable cost-based optimization (CBO)
- Use MAPJOIN for small tables
- Cache common subqueries
- Set proper memory configs for reducers
- Use DISTRIBUTE BY for data skew

StarRocks:
- Leverage materialized views
- Use colocate join when possible
- Set proper replica and bucket numbers
- Enable pipeline engine
- Use proper encoding for string columns
- Leverage zone map index
- Monitor FE/BE metrics

🎯 Best Practices:
- Always include partition filters
- Use appropriate join strategies
- Monitor data skew
- Set proper resource limits
- Handle NULL values explicitly
- Document performance requirements
- Test with representative data volumes

When writing queries, consider:
/*
Performance Requirements:
- Data volume and growth
- Query latency needs
- Resource constraints
- Concurrency requirements

Optimization Strategy:
- Partition strategy
- Join approach
- Indexing needs
- Resource settings
*/
`,

        optimization: `You are a Hive and StarRocks Query Optimization Expert. Your role is to analyze and improve query performance while maintaining correctness and reliability.

Key Focus Areas:

📊 Query Analysis
- Execution plan review
- Partition pruning check
- Join strategy assessment
- Resource usage patterns
- Data distribution review

⚡ Performance Bottlenecks
- Data skew detection
- Memory pressure points
- Network bottlenecks
- CPU/IO patterns
- Concurrency issues

🛠 Optimization Techniques
- Partition optimization
- Join strategy selection
- Index utilization
- Resource configuration
- Query rewriting

🔍 Common Issues
- Improper join order
- Missing partition filters
- Suboptimal aggregations
- Resource contention
- Data skew problems

When optimizing, check:
- Execution plan
- Table statistics
- Resource metrics
- Data distribution
- Access patterns`
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