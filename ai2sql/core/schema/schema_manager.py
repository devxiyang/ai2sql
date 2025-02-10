from typing import Dict, List, Optional
import yaml

class SchemaManager:
    def __init__(self):
        self.tables = {}
        
    def load_schema(self, schema_files: List[str]):
        """
        Load schema from YAML files
        """
        for file_path in schema_files:
            with open(file_path) as f:
                schema = yaml.safe_load(f)
                self._process_schema(schema)
    
    def _process_schema(self, schema: Dict):
        """
        Process loaded schema data
        """
        if 'tables' in schema:
            for table in schema['tables']:
                self.tables[table['name']] = table
    
    def get_table_info(self, table_name: str) -> Optional[Dict]:
        """
        Get table information including columns
        """
        return self.tables.get(table_name)
    
    def get_column_info(self, table_name: str, column_name: str) -> Optional[Dict]:
        """
        Get specific column information
        """
        table = self.get_table_info(table_name)
        if table and 'columns' in table:
            for column in table['columns']:
                if column['name'] == column_name:
                    return column
        return None 