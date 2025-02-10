from typing import Dict, Any, Union
import yaml
import os
from pathlib import Path
import logging

class Config:
    DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "config" / "default.yml"
    
    def __init__(self):
        self.config = self._load_yaml(self.DEFAULT_CONFIG_PATH)
        if not self.config:
            raise ValueError("无法加载默认配置文件")
    
    def load_config(self) -> None:
        """按优先级加载配置"""
        # 1. 加载用户全局配置 (~/.ai2sqlrc)
        user_config = self._load_yaml(Path.home() / ".ai2sqlrc")
        if user_config:
            self._deep_update(self.config, user_config)
        
        # 2. 加载项目配置 (.ai2sqlrc)
        project_config = self._load_yaml(".ai2sqlrc")
        if project_config:
            self._deep_update(self.config, project_config)
        
        # 3. 加载环境变量（最高优先级）
        self._load_env_vars()
    
    def _deep_update(self, d: dict, u: dict) -> dict:
        """递归更新字典"""
        for k, v in u.items():
            if isinstance(v, dict):
                d[k] = self._deep_update(d.get(k, {}), v)
            else:
                d[k] = v
        return d
    
    def _load_yaml(self, path: Union[str, Path]) -> Dict[str, Any]:
        try:
            with open(path) as f:
                return yaml.safe_load(f) or {}
        except:
            return {}
    
    def _load_env_vars(self) -> None:
        """加载环境变量"""
        env_mappings = {
            # API 配置
            "API_KEY": ("api", "key"),
            "API_BASE_URL": ("api", "base_url"),
            "API_MODEL": ("api", "model"),
            
            # 模型参数
            "MODEL_TEMPERATURE": ("model", "temperature", float),
            "MODEL_MAX_TOKENS": ("model", "max_tokens", int),
            "MODEL_TOP_P": ("model", "top_p", float),
            "MODEL_TIMEOUT": ("model", "timeout", int),
            
            # SQL 配置
            "SQL_DIALECT": ("sql", "dialect"),
            "SQL_THEME": ("sql", "theme"),
            
            # 会话配置
            "SESSION_TIMEOUT": ("session", "timeout", int),
        }
        
        for env_var, mapping in env_mappings.items():
            if value := os.getenv(env_var):
                # 处理类型转换
                if len(mapping) == 3:
                    section, key, type_func = mapping
                    try:
                        value = type_func(value)
                    except ValueError:
                        continue
                else:
                    section, key = mapping
                
                if section not in self.config:
                    self.config[section] = {}
                self.config[section][key] = value
    
    def get(self, *keys: str, default: Any = None) -> Any:
        """获取嵌套配置值"""
        value = self.config
        for key in keys:
            if not isinstance(value, dict):
                return default
            value = value.get(key, default)
            if value is None:
                return default
        return value 