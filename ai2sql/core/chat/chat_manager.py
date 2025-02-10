from typing import List, Dict, Any
import openai

class ChatManager:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.history = []
        self.max_history = config.get('history_size', 1000)
    
    async def generate_response(self, user_input: str) -> str:
        """
        Generate SQL from natural language using OpenAI API
        """
        # TODO: Implement OpenAI API integration
        pass

    def add_to_history(self, message: Dict[str, str]):
        """
        Add message to conversation history
        """
        self.history.append(message)
        if len(self.history) > self.max_history:
            self.history.pop(0) 