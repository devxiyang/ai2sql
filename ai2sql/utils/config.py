from typing import Dict, Any, Union
import yaml
import os
from pathlib import Path
import logging

class Config:
    def __init__(self):
        self.config: Dict[str, Any] = {
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com",
            "dialect": "hive",
            "history_size": 1000,
            "theme": "monokai",
            "temperature": 0.7,
            "max_tokens": 2000,
            # 通用SQL配置
            "sql": {
                "default_database": "default",
                "max_rows": 1000,
                "timeout": 30,
                "show_execution_plan": True
            }
        }
        
    def load_config(self) -> None:
        """加载配置文件"""
        # 加载默认配置
        package_config = self._load_yaml("default_config.yml")
        if package_config:
            self.config.update(package_config)
            
        # 加载用户配置
        user_config_path = Path.home() / ".ai2sqlconfig"
        user_config = self._load_yaml(user_config_path)
        if user_config:
            self.config.update(user_config)
            
        # 加载项目配置
        project_config = self._load_yaml(".ai2sqlconfig")
        if project_config:
            self.config.update(project_config)
            
        # 加载环境变量
        self._load_env_vars()
        
    def _load_yaml(self, path: Union[str, Path]) -> Dict[str, Any]:
        """加载YAML配置文件"""
        try:
            with open(path) as f:
                return yaml.safe_load(f) or {}
        except:
            return {}
            
    def _load_env_vars(self) -> None:
        """加载环境变量配置"""
        env_mapping = {
            # API配置
            "DEEPSEEK_API_KEY": "api_key",
            "AI2SQL_BASE_URL": "base_url",
            
            # 模型配置
            "AI2SQL_MODEL": "model",
            "AI2SQL_DIALECT": "dialect",
            
            # UI配置
            "AI2SQL_THEME": "theme",
            "AI2SQL_HISTORY_SIZE": "history_size",
            
            # 日志配置
            "LOG_LEVEL": "log_level"
        }
        
        for env_var, config_key in env_mapping.items():
            if value := os.getenv(env_var):
                self.config[config_key] = value
                
        # 设置日志级别
        if log_level := self.config.get("log_level"):
            logging.basicConfig(level=getattr(logging, log_level.upper()))
        
    def get(self, key: str, default: Any = None) -> Any:
        """获取配置值"""
        return self.config.get(key, default) 