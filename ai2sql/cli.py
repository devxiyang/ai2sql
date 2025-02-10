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
from typing import Optional

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
@click.option('--dialect', '-d', help='SQL dialect')
@click.option('--api-key', envvar='API_KEY', help='API key')
@click.option('--timeout', '-t', type=int, help='Session timeout')
@click.option('--temperature', type=float, help='Model temperature')
@click.option('--max-tokens', type=int, help='Max tokens')
@click.option('--top-p', type=float, help='Top P value')
def chat(schema: str, dialect: str, api_key: str, timeout: int,
         temperature: float, max_tokens: int, top_p: float):
    """Start interactive chat session"""
    config = Config()
    config.load_config()
    
    # 命令行参数覆盖配置
    model_config = config.get("model", {})
    if temperature is not None:
        model_config["temperature"] = temperature
    if max_tokens is not None:
        model_config["max_tokens"] = max_tokens
    if top_p is not None:
        model_config["top_p"] = top_p
    
    try:
        manager = ChatManager(
            api_key=api_key or config.get("api", "key"),
            model=config.get("api", "model"),
            base_url=config.get("api", "base_url"),
            model_config=model_config
        )
        
        if schema:
            manager.schema_manager.load_schema_file(schema)
        
        manager.set_dialect(dialect or config.get("sql", "dialect"))
        
        session_timeout = timeout or config.get("session", "timeout", default=300)
        
        console.print("[bold green]AI2SQL Chat[/bold green] (输入 'exit' 退出)\n")
        console.print(f"[dim]会话将在 {session_timeout} 秒无输入后自动结束[/dim]\n")
        
        last_input_time = time.time()
        
        while True:
            try:
                # 检查是否有输入可读
                rlist, _, _ = select.select([sys.stdin], [], [], 1.0)
                
                # 检查超时
                if time.time() - last_input_time > session_timeout:
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
                
                with console.status("[bold yellow]AI正在思考...[/bold yellow]"):
                    collected_text = []
                    with Live(console=console, refresh_per_second=4) as live:
                        for chunk in manager.generate_response(query):
                            collected_text.append(chunk)
                            try:
                                # 思维链内容使用不同的样式
                                if chunk.startswith("思考过程："):
                                    live.update(f"[dim]{chunk}[/dim]")
                                else:
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