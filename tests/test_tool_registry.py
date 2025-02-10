import pytest
from ai2sql.core.tools import ToolRegistry

def test_tool_registration():
    registry = ToolRegistry()
    
    @registry.register('test_tool', 'Test tool description')
    def test_tool():
        return "test result"
    
    # Verify tool registration
    tools = registry.list_tools()
    assert 'test_tool' in tools
    assert tools['test_tool'] == 'Test tool description'
    
    # Verify tool execution
    tool = registry.get_tool('test_tool')
    assert tool is not None
    assert tool['function']() == "test result" 