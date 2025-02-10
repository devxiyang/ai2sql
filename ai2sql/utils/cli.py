from typing import Optional
import click
from rich.console import Console
from rich.syntax import Syntax

console = Console()

class CLI:
    def __init__(self):
        self.console = Console()
    
    def display_sql(self, sql: str, dialect: str = "mysql"):
        """
        Display formatted SQL with syntax highlighting
        """
        syntax = Syntax(sql, "sql", theme="monokai")
        self.console.print(syntax)
    
    def display_error(self, message: str):
        """
        Display error message
        """
        self.console.print(f"[red]Error:[/red] {message}") 