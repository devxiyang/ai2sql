from typing import Dict, Set, Optional
from enum import Enum

class SQLDialect(str, Enum):
    ATHENA = "athena"
    BIGQUERY = "bigquery"
    CLICKHOUSE = "clickhouse"
    DATABRICKS = "databricks"
    DORIS = "doris"
    DRILL = "drill"
    DRUID = "druid"
    DUCKDB = "duckdb"
    DUNE = "dune"
    HIVE = "hive"
    MATERIALIZE = "materialize"
    MYSQL = "mysql"
    ORACLE = "oracle"
    POSTGRES = "postgres"
    PRESTO = "presto"
    PRQL = "prql"
    REDSHIFT = "redshift"
    RISINGWAVE = "risingwave"
    SNOWFLAKE = "snowflake"
    SPARK = "spark"
    SPARK2 = "spark2"
    SQLITE = "sqlite"
    STARROCKS = "starrocks"
    TABLEAU = "tableau"
    TERADATA = "teradata"
    TRINO = "trino"
    TSQL = "tsql"

class DialectManager:
    """SQL方言管理器"""
    
    # 方言特定的提示模板
    DIALECT_PROMPTS: Dict[str, str] = {
        SQLDialect.HIVE: """
        When working with Hive:
        1. Consider using appropriate partitioning strategies
        2. Use efficient JOIN strategies (MAP JOIN for small tables)
        3. Add partition pruning when applicable
        4. Consider data distribution and skew
        5. Use appropriate file formats (ORC/Parquet)
        6. Consider bucketing for large tables
        7. Be aware of Hive's limitations with transactions""",
        
        SQLDialect.BIGQUERY: """
        When working with BigQuery:
        1. Use partitioning and clustering appropriately
        2. Consider cost optimization strategies
        3. Use appropriate table expiration
        4. Leverage BigQuery ML when applicable
        5. Use appropriate data types for performance
        6. Consider using authorized views for security
        7. Optimize for slot utilization""",
        
        SQLDialect.SNOWFLAKE: """
        When working with Snowflake:
        1. Use appropriate warehouse sizing
        2. Leverage time travel capabilities
        3. Use clustering keys effectively
        4. Consider materialized views
        5. Use appropriate data sharing features
        6. Optimize for credit usage
        7. Use micro-partitions efficiently""",
        
        SQLDialect.POSTGRES: """
        When working with PostgreSQL:
        1. Use appropriate index types (B-tree, GiST, etc.)
        2. Consider materialized views
        3. Use EXPLAIN ANALYZE for optimization
        4. Leverage PostgreSQL-specific features
        5. Use appropriate extensions
        6. Consider partitioning strategies
        7. Optimize vacuum and analyze operations""",
        
        SQLDialect.MYSQL: """
        When working with MySQL:
        1. Use appropriate storage engines (InnoDB/MyISAM)
        2. Consider index types and coverage
        3. Use EXPLAIN for query analysis
        4. Be aware of transaction isolation levels
        5. Consider partitioning for large tables
        6. Optimize buffer pool usage
        7. Use appropriate character sets and collations""",
        
        SQLDialect.SPARK: """
        When working with Spark SQL:
        1. Consider data distribution and shuffling
        2. Use appropriate caching strategies
        3. Optimize for partition pruning
        4. Consider broadcast joins for small tables
        5. Use window functions efficiently
        6. Leverage Catalyst optimizer hints
        7. Consider adaptive query execution""",
        
        SQLDialect.REDSHIFT: """
        When working with Redshift:
        1. Use appropriate distribution keys
        2. Choose proper sort keys
        3. Use VACUUM and ANALYZE regularly
        4. Consider compression encodings
        5. Use appropriate WLM configuration
        6. Leverage late materialization
        7. Optimize for columnar storage""",
        
        SQLDialect.CLICKHOUSE: """
        When working with ClickHouse:
        1. Use appropriate table engines
        2. Consider materialized views
        3. Optimize for columnar storage
        4. Use efficient primary keys
        5. Leverage distributed tables
        6. Consider data skipping indices
        7. Use appropriate compression methods""",
        
        SQLDialect.DATABRICKS: """
        When working with Databricks SQL:
        1. Use Delta Lake features effectively
        2. Consider auto-optimization settings
        3. Use appropriate cluster configurations
        4. Leverage photon acceleration
        5. Use efficient file formats
        6. Consider data skipping
        7. Optimize for concurrent queries""",
        
        SQLDialect.ORACLE: """
        When working with Oracle:
        1. Use appropriate indexing strategies
        2. Consider materialized views
        3. Use partitioning effectively
        4. Leverage Oracle-specific hints
        5. Consider parallel execution
        6. Use appropriate storage clauses
        7. Optimize for buffer cache usage""",
        
        SQLDialect.PRESTO: """
        When working with Presto:
        1. Use appropriate connector optimizations
        2. Consider predicate pushdown
        3. Optimize for memory usage
        4. Use efficient JOIN strategies
        5. Consider query priorities
        6. Use appropriate resource groups
        7. Leverage dynamic filtering""",
        
        SQLDialect.SQLITE: """
        When working with SQLite:
        1. Use appropriate indexes
        2. Consider WAL mode for writes
        3. Use efficient transaction patterns
        4. Optimize for concurrent access
        5. Use appropriate page sizes
        6. Consider memory settings
        7. Use prepared statements""",
        
        SQLDialect.DORIS: """
        When working with Doris:
        1. Use appropriate data models
        2. Consider rollup tables
        3. Use efficient partition designs
        4. Optimize for materialized views
        5. Use appropriate data distribution
        6. Consider tablet splitting
        7. Leverage bitmap indexes""",
        
        SQLDialect.STARROCKS: """
        When working with StarRocks:
        1. Use appropriate table types
        2. Consider materialized views
        3. Use efficient sort keys
        4. Optimize for columnar storage
        5. Use appropriate data models
        6. Consider resource isolation
        7. Leverage CBO optimizer""",
        
        SQLDialect.TRINO: """
        When working with Trino:
        1. Use connector-specific optimizations
        2. Consider dynamic filtering
        3. Use appropriate resource groups
        4. Optimize for memory usage
        5. Use efficient JOIN strategies
        6. Consider spilling to disk
        7. Leverage predicate pushdown"""
    }
    
    @classmethod
    def get_dialect_prompt(cls, dialect: str) -> Optional[str]:
        """获取方言特定的提示"""
        return cls.DIALECT_PROMPTS.get(dialect.lower())
    
    @classmethod
    def is_supported(cls, dialect: str) -> bool:
        """检查方言是否支持"""
        return dialect.lower() in {d.value for d in SQLDialect}
    
    @classmethod
    def get_supported_dialects(cls) -> Set[str]:
        """获取所有支持的方言"""
        return {d.value for d in SQLDialect} 