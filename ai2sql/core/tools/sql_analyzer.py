from typing import Dict, Any
import sqlglot

class SQLAnalyzer:
    def __init__(self):
        pass
    
    def analyze(self, sql_query: str, dialect: str = "mysql") -> Dict[str, Any]:
        """
        分析SQL查询并返回解析结果
        """
        try:
            # 解析SQL
            parsed = sqlglot.parse_one(sql_query, dialect)
            
            # 返回基本信息
            return {
                'parsed': str(parsed),          # 解析树
                'formatted': parsed.sql(pretty=True),  # 格式化的SQL
                'dialect': dialect,             # SQL方言
                'is_valid': True,              # 是否有效
                'tokens': parsed.tokens,        # SQL标记
                'type': parsed.key             # SQL类型(SELECT/INSERT等)
            }
            
        except Exception as e:
            return {
                'parsed': None,
                'dialect': dialect,
                'is_valid': False,
                'error': str(e)
            }
    
    def format_sql(self, sql_query: str, dialect: str = "mysql") -> str:
        """
        格式化SQL查询
        """
        try:
            parsed = sqlglot.parse_one(sql_query, dialect)
            return parsed.sql(pretty=True, dialect=dialect)
        except Exception as e:
            raise ValueError(f"SQL格式化错误: {str(e)}")

    def translate(self, sql_query: str, from_dialect: str, to_dialect: str) -> str:
        """
        在不同SQL方言间转换
        """
        try:
            parsed = sqlglot.parse_one(sql_query, read=from_dialect)
            return parsed.sql(dialect=to_dialect)
        except Exception as e:
            raise ValueError(f"SQL转换错误: {str(e)}") 