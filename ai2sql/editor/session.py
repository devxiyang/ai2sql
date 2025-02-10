from typing import List, Dict, Optional
from ..core.chat import ChatManager
from ..core.tools import SQLAnalyzer
from ..utils.cli import CLI

class EditorSession:
    def __init__(self, config: Dict):
        self.config = config
        self.chat_manager = ChatManager(config)
        self.sql_analyzer = SQLAnalyzer()
        self.cli = CLI()
        self.history: List[Dict] = []
        
    async def process_input(self, user_input: str) -> str:
        """
        Process user input and generate SQL
        """
        try:
            # Generate SQL using AI
            sql = await self.chat_manager.generate_response(user_input)
            
            # Analyze and validate SQL
            analysis = self.sql_analyzer.analyze(sql)
            
            # Format and display result
            formatted_sql = self.sql_analyzer.format_sql(sql)
            self.cli.display_sql(formatted_sql)
            
            # Add to history
            self.history.append({
                'input': user_input,
                'sql': sql,
                'analysis': analysis
            })
            
            return formatted_sql
            
        except Exception as e:
            self.cli.display_error(str(e))
            return ""
    
    def get_history(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get session history
        """
        if limit:
            return self.history[-limit:]
        return self.history 