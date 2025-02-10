from typing import Dict, Any, Callable, List
from functools import wraps

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self._analyzers: Dict[str, Any] = {}
        
    def register(self, name: str, description: str):
        """
        Decorator to register a tool
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                return func(*args, **kwargs)
            
            self.tools[name] = {
                'function': wrapper,
                'description': description
            }
            return wrapper
        return decorator
    
    def get_tool(self, name: str) -> Dict[str, Any]:
        """
        Get registered tool by name
        """
        return self.tools.get(name)
    
    def list_tools(self) -> Dict[str, str]:
        """
        List all registered tools and their descriptions
        """
        return {name: tool['description'] 
                for name, tool in self.tools.items()}

    def register_analyzer(self, analyzer_name: str, analyzer_instance: Any) -> None:
        """注册新的分析器工具"""
        if not hasattr(analyzer_instance, 'analyze'):
            raise ValueError("分析器必须实现 analyze 方法")
        self._analyzers[analyzer_name] = analyzer_instance

    def get_analyzer(self, analyzer_name: str) -> Any:
        """获取指定的分析器实例"""
        return self._analyzers.get(analyzer_name)

    def list_analyzers(self) -> List[str]:
        """列出所有已注册的分析器"""
        return list(self._analyzers.keys())

    def register_hive_tools(self):
        """注册HiveSQL特定工具"""
        @self.register("analyze_hive", "Analyze HiveSQL specific features")
        def analyze_hive(sql: str) -> Dict[str, Any]:
            analyzer = self._analyzers.get("hive_analyzer")
            if not analyzer:
                raise ValueError("HiveSQL分析器未注册")
            return analyzer.analyze_hive_specific(sql)
        
        @self.register("optimize_hive", "Suggest HiveSQL optimizations")
        def optimize_hive(sql: str) -> List[str]:
            analyzer = self._analyzers.get("hive_analyzer")
            if not analyzer:
                raise ValueError("HiveSQL分析器未注册")
            return analyzer.suggest_hive_optimizations(sql)

    def register_sql_tools(self):
        """注册SQL分析工具"""
        @self.register("analyze_sql", "Analyze SQL query structure and optimization opportunities")
        def analyze_sql(sql: str, dialect: str = "hivesql") -> Dict[str, Any]:
            analyzer = self._analyzers.get("sql_analyzer")
            if not analyzer:
                raise ValueError("SQL分析器未注册")
            return analyzer.analyze(sql, dialect)
        
        @self.register("optimize_sql", "Suggest SQL optimizations")
        def optimize_sql(sql: str, dialect: str = "hivesql") -> List[str]:
            analyzer = self._analyzers.get("sql_analyzer")
            if not analyzer:
                raise ValueError("SQL分析器未注册")
            return analyzer.suggest_optimizations(sql) 