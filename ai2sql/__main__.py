import click
import asyncio
from .utils.config import Config
from .utils.cli import CLI
from .editor import EditorSession
from .core.schema import SchemaManager

@click.group()
def cli():
    """AI2SQL - Convert natural language to SQL queries"""
    pass

@cli.command()
@click.option('--schema', multiple=True, help='Path to schema file(s)')
def shell(schema):
    """Start interactive SQL shell"""
    config = Config()
    config.load_config()
    
    # Initialize components
    schema_manager = SchemaManager()
    if schema:
        schema_manager.load_schema(schema)
    
    session = EditorSession(config.config)
    cli = CLI()
    
    async def repl():
        while True:
            try:
                user_input = input("ai2sql> ")
                if user_input.lower() in ['exit', 'quit']:
                    break
                    
                result = await session.process_input(user_input)
                if result:
                    cli.display_sql(result)
                    
            except KeyboardInterrupt:
                print("\nUse 'exit' or 'quit' to exit")
            except Exception as e:
                cli.display_error(str(e))
    
    asyncio.run(repl())

if __name__ == '__main__':
    cli() 