from typing import Dict, Any, List, Set
import sqlglot
from sqlglot.expressions import (
    Select, Join, Where, Group, Having, Table, Column,
    Anonymous, Func
)

class SQLAnalyzer:
    def __init__(self):
        pass
    
    def analyze(self, sql_query: str, dialect: str = "mysql") -> Dict[str, Any]:
        """
        分析SQL查询结构和复杂度
        """
        try:
            # 解析SQL
            parsed = sqlglot.parse_one(sql_query, dialect)
            
            # 收集基本信息
            analysis = {
                'tables': self._extract_tables(parsed),
                'columns': self._extract_columns(parsed),
                'conditions': self._extract_conditions(parsed)
            }
            
            return analysis
            
        except Exception as e:
            raise ValueError(f"SQL分析错误: {str(e)}")
    
    def format_sql(self, sql_query: str, dialect: str = "mysql") -> str:
        """
        格式化SQL查询
        """
        try:
            parsed = sqlglot.parse_one(sql_query, dialect)
            return parsed.sql(pretty=True, dialect=dialect)
        except Exception as e:
            raise ValueError(f"SQL格式化错误: {str(e)}")
    
    def _extract_tables(self, parsed) -> Set[str]:
        """
        提取查询中使用的表
        """
        tables = set()
        for exp in parsed.walk():
            if isinstance(exp, Table):
                tables.add(exp.name)
        return tables
    
    def _extract_columns(self, parsed) -> Dict[str, List[str]]:
        """
        提取查询中使用的列及其所属表
        """
        columns = {}
        for exp in parsed.walk():
            if isinstance(exp, Column):
                table = exp.table or 'unknown'
                if table not in columns:
                    columns[table] = []
                columns[table].append(exp.name)
        return columns
    
    def _extract_conditions(self, parsed) -> List[str]:
        """
        提取WHERE条件
        """
        conditions = []
        for exp in parsed.walk():
            if isinstance(exp, Where):
                conditions.append(str(exp.this))
        return conditions 