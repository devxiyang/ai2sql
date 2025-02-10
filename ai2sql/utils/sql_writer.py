import os
from datetime import datetime
from pathlib import Path

class SQLWriter:
    def __init__(self, output_dir: str = "generated_sql"):
        """
        初始化 SQL 写入器
        
        Args:
            output_dir: SQL文件输出目录，默认为 generated_sql
        """
        self.output_dir = output_dir
        self._ensure_output_dir()
    
    def _ensure_output_dir(self):
        """确保输出目录存在"""
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
    
    def _generate_filename(self, prefix: str = "") -> str:
        """生成SQL文件名"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if prefix:
            prefix = f"{prefix}_"
        return f"{prefix}{timestamp}.sql"
    
    def write_sql(self, sql: str, description: str = "", prefix: str = "") -> str:
        """
        将SQL写入文件
        
        Args:
            sql: SQL语句
            description: SQL描述/注释
            prefix: 文件名前缀
            
        Returns:
            str: 生成的SQL文件路径
        """
        filename = self._generate_filename(prefix)
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            if description:
                f.write(f"-- Description: {description}\n")
                f.write(f"-- Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("--" + "-" * 50 + "\n\n")
            f.write(sql.strip() + "\n")
        
        return filepath 