from typing import Dict, Any
import yaml
import os

class Config:
    DEFAULT_CONFIG = {
        'model': 'gpt-3.5-turbo',
        'dialect': 'mysql',
        'history_size': 1000,
        'theme': 'monokai'
    }
    
    def __init__(self):
        self.config = self.DEFAULT_CONFIG.copy()
    
    def load_config(self):
        """
        Load configuration from multiple sources
        """
        # Load user config from ~/.ai2sqlconfig
        user_config = os.path.expanduser('~/.ai2sqlconfig')
        if os.path.exists(user_config):
            self._load_yaml(user_config)
            
        # Load project config from .ai2sqlconfig
        if os.path.exists('.ai2sqlconfig'):
            self._load_yaml('.ai2sqlconfig')
    
    def _load_yaml(self, path: str):
        with open(path) as f:
            config = yaml.safe_load(f)
            if config:
                self.config.update(config) 