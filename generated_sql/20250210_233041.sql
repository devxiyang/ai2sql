-- Description: all
-- Generated at: 2025-02-10 23:30:41
----------------------------------------------------

Here's a structured approach to writing optimized Hive SQL queries, incorporating best practices and Hive-specific optimizations:

### 1. Query Structure & Readability
```sql
WITH cte_processed_data AS (
    SELECT /*+ MAPJOIN(small) */
        t1.id,
        t1.sale_date,
        small.category_name,
        t2.total_amount
    FROM
        main_table t1
    JOIN small_table small ON t1.category_id = small.category_id
    LEFT JOIN (
        SELECT 
            id,
            SUM(amount) AS total_amount
        FROM transactions
        WHERE trans_date BETWEEN '2023-01-01' AND '2023-03-31'
        GROUP BY id
    ) t2 ON t1.id = t2.id
    WHERE t1.sale_date >= '2023-01-01'  -- Partition pruning
)
SELECT 
    category_name,
    AVG(total_amount) AS avg_amount,
    COUNT(*) AS record_count
FROM cte_processed_data
GROUP BY category_name
CLUSTER BY category_name;
```

### 2. Hive-Specific Optimizations

**a. Partitioning & Pruning:**
- Use partitioned tables with frequently filtered columns (e.g., date)
```sql
CREATE TABLE sales (
    id INT,
    category_id INT,
    amount DECIMAL(10,2)
)
PARTITIONED BY (sale_date DATE)
STORED AS ORC;
```

**b. MAPJOIN for Small Tables:**
```sql
SELECT /*+ MAPJOIN(small_table) */ 
    ...
```

**c. Bucketing for Large Tables:**
```sql
CREATE TABLE large_table (
    id INT,
    ...
)
CLUSTERED BY (id) INTO 32 BUCKETS
STORED AS ORC;
```

### 3. Performance Considerations

1. **Data Skew Handling:**
```sql
-- For skewed keys
SET hive.optimize.skewjoin=true;
SET hive.skewjoin.key=100000;
```

2. **Vectorization (Hive 0.13+):**
```sql
SET hive.vectorized.execution.enabled=true;
```

3. **Cost-Based Optimization (Hive 0.14+):**
```sql
SET hive.cbo.enable=true;
SET hive.compute.query.using.stats=true;
```

### 4. Schema Validation Example
```sql
DESCRIBE FORMATTED table_name;
SHOW PARTITIONS table_name;
```

### 5. Data Format Best Practices
```sql
CREATE TABLE optimized_table (
    ...
)
STORED AS ORC
TBLPROPERTIES (
    "orc.compress"="SNAPPY",
    "transactional"="false" -- Hive 4.0+ ACID tables
);
```

### 6. Query Execution Plan
```sql
EXPLAIN [EXTENDED|DEPENDENCY|AUTHORIZATION] your_query;
```

### 7. Transaction Limitations Workaround
```sql
-- Use for small mutations instead of ACID:
INSERT OVERWRITE TABLE target_table
SELECT * FROM source_table WHERE condition;
```

Would you like me to help with a specific query or optimization scenario? Please provide:
1. Table schema(s)
2. Sample data distribution
3. Query requirements
4. Performance pain points (if any)

This will help me provide the most appropriate optimizations for your specific use case.
