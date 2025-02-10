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
import sys
import select
import time

console = Console()
TIMEOUT = 300  # 5分钟无输入自动退出

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
@click.option('--timeout', '-t', default=300, help='Session timeout in seconds')
def chat(schema: str, dialect: str, api_key: str, timeout: int):
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
        console.print(f"[dim]会话将在 {timeout} 秒无输入后自动结束[/dim]\n")
        
        last_input_time = time.time()
        
        while True:
            try:
                # 检查是否有输入可读
                rlist, _, _ = select.select([sys.stdin], [], [], 1.0)
                
                # 检查超时
                if time.time() - last_input_time > timeout:
                    console.print("\n[yellow]会话超时，自动退出[/yellow]")
                    break
                
                if not rlist:
                    continue
                
                # 读取输入
                query = console.input("[bold blue]You:[/bold blue] ")
                last_input_time = time.time()
                
                if query.lower() in ('exit', 'quit'):
                    break
                
                if not query.strip():
                    continue
                    
                console.print("\n[bold green]AI:[/bold green]", end=" ")
                
                # 使用 Rich 的 Live 显示来渲染流式输出
                collected_text = []
                with Live(console=console, refresh_per_second=4) as live:
                    for chunk in manager.generate_response(query):
                        collected_text.append(chunk)
                        try:
                            live.update(Markdown("".join(collected_text)))
                        except:
                            live.update("".join(collected_text))
                
                console.print("\n")
                
            except KeyboardInterrupt:
                console.print("\n[yellow]用户中断，退出会话[/yellow]")
                break
            except Exception as e:
                console.print(f"[bold red]Error:[/bold red] {str(e)}\n")
                
    except ValueError as e:
        console.print(f"[bold red]Configuration Error:[/bold red] {str(e)}\n")
        return

if __name__ == '__main__':
    cli() 