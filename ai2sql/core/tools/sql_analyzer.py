from typing import Dict, Any, List
import sqlglot
from sqlglot.errors import ParseError, TokenError

class SQLAnalyzer:
    def __init__(self):
        pass
    
    def analyze(self, sql_query: str, dialect: str = "mysql") -> Dict[str, Any]:
        """
        分析SQL查询并返回解析结果
        """
        if not sql_query or not sql_query.strip():
            return {
                'parsed': None,
                'dialect': dialect,
                'is_valid': False,
                'error': "SQL语句不能为空"
            }
            
        try:
            # 使用 sqlglot 的 parse_one 方法
            parsed = sqlglot.parse_one(sql_query, read=dialect)
            
            # 获取所有标记
            tokens = []
            try:
                for token in sqlglot.tokens(sql_query):
                    tokens.append(str(token))
            except:
                pass
            
            # 返回基本信息
            return {
                'parsed': str(parsed),
                'formatted': parsed.sql(pretty=True),
                'dialect': dialect,
                'is_valid': True,
                'tokens': tokens,
                'type': parsed.__class__.__name__.upper()
            }
            
        except (ParseError, TokenError) as e:
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
        if not sql_query or not sql_query.strip():
            raise ValueError("SQL语句不能为空")
            
        try:
            # 解析并格式化
            parsed = sqlglot.parse_one(sql_query, read=dialect)
            if not parsed:
                raise ValueError("无法解析SQL语句")
            return parsed.sql(pretty=True)
        except (ParseError, TokenError) as e:
            raise ValueError(f"SQL解析错误: {str(e)}")
        except Exception as e:
            raise ValueError(f"SQL格式化错误: {str(e)}") 