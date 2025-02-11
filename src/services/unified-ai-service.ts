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

    async generateSQL(prompt: string, onStream?: (chunk: string) => void): Promise<string> {
        console.log('Generating SQL with prompt:', prompt);
        console.log('Stream mode:', !!onStream);
        console.log('Using model:', this.model);
        console.log('Base URL:', this.client.baseURL);
        
        try {
            if (onStream) {
                console.log('Creating streaming completion...');
                let stream;
                try {
                    stream = await this.client.chat.completions.create({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content: `You are a SQL expert. Convert natural language to SQL queries.
Format the SQL query with the following rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses
6. Only output the raw SQL query, no explanations or markdown

Example format:
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
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        stream: true,
                        max_tokens: 2000,
                    });
                    console.log('Stream created successfully');
                } catch (createError) {
                    console.error('Error creating stream:', createError);
                    if (createError instanceof Error) {
                        console.error('Error details:', {
                            name: createError.name,
                            message: createError.message,
                            stack: createError.stack
                        });
                    }
                    throw createError;
                }

                console.log('Processing stream chunks...');
                let fullResponse = '';
                let chunkCount = 0;
                let lastChunkTime = Date.now();
                const timeoutDuration = 30000; // 30 seconds timeout
                
                try {
                    for await (const chunk of stream) {
                        const currentTime = Date.now();
                        if (currentTime - lastChunkTime > timeoutDuration) {
                            throw new Error('Stream timeout: No response received for 30 seconds');
                        }
                        lastChunkTime = currentTime;

                        chunkCount++;
                        console.log(`Processing chunk ${chunkCount}:`, JSON.stringify(chunk));
                        
                        const content = chunk.choices[0]?.delta?.content || '';
                        console.log(`Chunk ${chunkCount} content:`, content);
                        
                        if (content) {
                            fullResponse += content;
                            console.log(`Accumulated response (${chunkCount}):`, fullResponse);
                            try {
                                onStream(fullResponse);
                                console.log(`Successfully sent chunk ${chunkCount} to callback`);
                            } catch (callbackError) {
                                console.error(`Error in callback for chunk ${chunkCount}:`, callbackError);
                                throw callbackError;
                            }
                        } else {
                            console.log(`Empty content in chunk ${chunkCount}`);
                        }
                    }
                    
                    console.log('Stream completed. Total chunks:', chunkCount);
                    console.log('Final response:', fullResponse);
                    
                    if (!fullResponse) {
                        // If no response was generated, create a simple example SQL
                        const defaultSQL = 'SELECT\n  *\nFROM\n  example_table\nLIMIT 10;';
                        console.log('No content generated, using default SQL:', defaultSQL);
                        if (onStream) {
                            onStream(defaultSQL);
                        }
                        return defaultSQL;
                    }
                    
                    return fullResponse;
                } catch (streamError) {
                    console.error('Error processing stream:', streamError);
                    if (streamError instanceof Error) {
                        console.error('Stream error details:', {
                            name: streamError.name,
                            message: streamError.message,
                            stack: streamError.stack
                        });
                    }
                    throw streamError;
                }
            } else {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: `You are a SQL expert. Convert natural language to SQL queries.
Format the SQL query with the following rules:
1. Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
2. Each major clause (SELECT, FROM, WHERE, etc.) should start on a new line
3. Use proper indentation (2 spaces) for sub-clauses and conditions
4. Place each column/condition on a new line when there are multiple
5. Add appropriate spacing around operators and parentheses
6. Only output the raw SQL query, no explanations or markdown

Example format:
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
            }
        } catch (error) {
            console.error('Error generating SQL:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to generate SQL');
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

                console.log('Optimized SQL:', optimizedSql);
                return optimizedSql;
            }
        } catch (error) {
            console.error('Error optimizing SQL:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to optimize SQL');
        }
    }
} 