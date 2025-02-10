from typing import Dict, Any, Callable
from functools import wraps

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        
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