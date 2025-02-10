import click
from pathlib import Path
from rich.console import Console
from rich.syntax import Syntax
from .core.chat import ChatManager
from .utils.config import Config
from rich.live import Live
from rich.markdown import Markdown
import os
from dotenv import load_dotenv

console = Console()

@click.group()
def cli():
    """AI2SQL - AI-powered SQL IDE"""
    # 加载环境变量
    load_dotenv()
    pass

@cli.command()
@click.option('--schema', '-s', type=click.Path(exists=True), help='Schema file path')
@click.option('--dialect', '-d', default='hive', help='SQL dialect')
@click.option('--api-key', envvar='API_KEY', help='API key for the AI service')
def chat(schema: str, dialect: str, api_key: str):
    """Start an interactive chat session"""
    config = Config()
    config.load_config()
    
    try:
        manager = ChatManager(
            api_key=api_key or config.get("api_key"),
            model=config.get("model"),
            base_url=config.get("base_url")
        )
        
        if schema:
            manager.schema_manager.load_schema_file(schema)
        
        manager.set_dialect(dialect)
        
        console.print("[bold green]AI2SQL Chat[/bold green] (输入 'exit' 退出)\n")
        
        while True:
            try:
                query = console.input("[bold blue]You:[/bold blue] ")
                if query.lower() in ('exit', 'quit'):
                    break
                    
                console.print("\n[bold green]AI:[/bold green]", end=" ")
                
                # 使用 Rich 的 Live 显示来渲染流式输出
                collected_text = []
                with Live(console=console, refresh_per_second=4) as live:
                    for chunk in manager.generate_response(query):
                        collected_text.append(chunk)
                        # 尝试将内容渲染为 Markdown
                        try:
                            live.update(Markdown("".join(collected_text)))
                        except:
                            live.update("".join(collected_text))
                
                console.print("\n")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                console.print(f"[bold red]Error:[/bold red] {str(e)}\n")
                
    except ValueError as e:
        console.print(f"[bold red]Configuration Error:[/bold red] {str(e)}\n")
        return

if __name__ == '__main__':
    cli() 