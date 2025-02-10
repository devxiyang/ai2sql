from typing import Dict, List, Optional, Union
from pathlib import Path
import yaml

class SchemaManager:
    def __init__(self):
        self.tables: Dict[str, Dict] = {}
        
    def load_schema_file(self, file_path: Union[str, Path]) -> None:
        """从YAML文件加载schema"""
        try:
            with open(file_path) as f:
                schema = yaml.safe_load(f)
                if schema and "tables" in schema:
                    for table in schema["tables"]:
                        self.tables[table["name"]] = table
        except Exception as e:
            raise ValueError(f"加载schema文件失败: {str(e)}")
    
    def get_schema_prompt(self) -> str:
        """生成schema提示词"""
        if not self.tables:
            return ""
            
        prompt = "Available tables and their structures:\n\n"
        
        for table_name, table in self.tables.items():
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