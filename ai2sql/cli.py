import click
from pathlib import Path
from rich.console import Console
from rich.syntax import Syntax
from .core.chat import ChatManager
from .utils.config import Config

console = Console()

@click.group()
def cli():
    """AI2SQL - AI-powered SQL IDE"""
    pass

@cli.command()
@click.option('--schema', multiple=True, help='Schema file path')
@click.option('--dialect', help='SQL dialect')
@click.option('--model', help='AI model to use')
def shell(schema, dialect, model):
    """启动交互式SQL shell"""
    config = Config()
    config.load_config()
    
    if dialect:
        config.config['dialect'] = dialect
    if model:
        config.config['model'] = model
    
    chat_manager = ChatManager(
        api_key=config.get("openai_api_key"),
        model=config.get("model"),
        dialect=config.get("dialect")
    )
    
    # 加载schema文件
    if schema:
        for schema_file in schema:
            try:
                chat_manager.schema_manager.load_schema_file(schema_file)
                console.print(f"[green]Loaded schema from {schema_file}[/green]")
            except Exception as e:
                console.print(f"[red]Error loading schema {schema_file}: {str(e)}[/red]")
    
    console.print("[bold green]Welcome to AI2SQL![/bold green]")
    console.print(f"Using model: {config.get('model')}")
    console.print(f"SQL dialect: {config.get('dialect')}")
    console.print("Type 'exit' to quit\n")
    
    while True:
        try:
            user_input = click.prompt("AI2SQL", type=str)
            
            if user_input.lower() == 'exit':
                break
                
            response = chat_manager.generate_response(user_input)
            
            if "error" in response:
                console.print(f"[red]Error:[/red] {response['error']}")
                if "details" in response:
                    console.print(f"[dim]Details: {response['details']}[/dim]")
                continue
                
            # 显示AI响应
            console.print("\n[bold blue]AI Response:[/bold blue]")
            console.print(response["content"])
            
            # 显示生成的SQL
            if response.get("tool_results"):
                for result in response["tool_results"]:
                    if "sql" in result.get("result", {}):
                        syntax = Syntax(
                            result["result"]["sql"],
                            "sql",
                            theme=config.get("theme")
                        )
                        console.print("\n[bold green]Generated SQL:[/bold green]")
                        console.print(syntax)
                        
        except KeyboardInterrupt:
            continue
        except Exception as e:
            console.print(f"[red]Error:[/red] {str(e)}")

if __name__ == '__main__':
    cli() 