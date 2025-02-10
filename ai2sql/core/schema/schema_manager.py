from typing import Dict, List, Optional, Union
from pathlib import Path
import yaml
import logging

logger = logging.getLogger(__name__)

class SchemaManager:
    def __init__(self):
        self.tables: Dict[str, Dict] = {}
        
    def load_schema_file(self, file_path: Union[str, Path]) -> None:
        """从YAML文件加载schema
        
        Args:
            file_path: schema文件路径
        """
        try:
            with open(file_path) as f:
                schema = yaml.safe_load(f)
                if schema and "tables" in schema:
                    for table in schema["tables"]:
                        table_name = table["name"]
                        if table_name in self.tables:
                            logger.warning(f"表 {table_name} 在多个schema文件中定义，将使用最新的定义")
                        self.tables[table_name] = table
                        logger.info(f"加载表定义: {table_name}")
        except Exception as e:
            raise ValueError(f"加载schema文件失败: {str(e)}")
            
    def load_schema_dir(self, dir_path: Union[str, Path], recursive: bool = True) -> None:
        """从目录加载所有schema文件
        
        Args:
            dir_path: schema目录路径
            recursive: 是否递归搜索子目录
        """
        dir_path = Path(dir_path)
        if not dir_path.exists():
            raise ValueError(f"目录不存在: {dir_path}")
            
        pattern = "**/*.yml" if recursive else "*.yml"
        schema_files = list(dir_path.glob(pattern))
        
        if not schema_files:
            logger.warning(f"在目录 {dir_path} 中未找到schema文件")
            return
            
        for schema_file in schema_files:
            try:
                logger.info(f"正在加载schema文件: {schema_file}")
                self.load_schema_file(schema_file)
            except Exception as e:
                logger.error(f"加载schema文件 {schema_file} 失败: {str(e)}")
                
    def clear_schemas(self) -> None:
        """清除所有已加载的schema"""
        self.tables.clear()
        logger.info("已清除所有schema定义")
    
    def get_schema_prompt(self) -> str:
        """生成schema提示词"""
        if not self.tables:
            return ""
            
        prompt = "Available tables and their structures:\n\n"
        
        for table_name, table in sorted(self.tables.items()):  # 按表名排序
            prompt += f"Table: {table_name}\n"
            if "comment" in table:
                prompt += f"Description: {table['comment']}\n"
            
            prompt += "Columns:\n"
            for column in table.get("columns", []):
                col_desc = f"- {column['name']} ({column['type']})"
                if column.get("nullable") is False:
                    col_desc += " NOT NULL"
                if "comment" in column:
                    col_desc += f" -- {column['comment']}"
                prompt += col_desc + "\n"
            prompt += "\n"
            
        return prompt
    
    def get_table_info(self, table_name: str) -> Optional[Dict]:
        """获取表信息"""
        return self.tables.get(table_name)
    
    def get_column_info(self, table_name: str, column_name: str) -> Optional[Dict]:
        """获取列信息"""
        table = self.get_table_info(table_name)
        if table and 'columns' in table:
            for column in table['columns']:
                if column['name'] == column_name:
                    return column
        return None
        
    def get_all_table_names(self) -> List[str]:
        """获取所有表名"""
        return sorted(self.tables.keys())
        
    def get_table_count(self) -> int:
        """获取已加载的表数量"""
        return len(self.tables) 