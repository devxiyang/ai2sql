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

def test_register_analyzer():
    registry = ToolRegistry()
    
    class MockAnalyzer:
        def analyze(self, sql: str):
            return "分析结果"
    
    analyzer = MockAnalyzer()
    registry.register_analyzer("mock_analyzer", analyzer)
    
    assert registry.get_analyzer("mock_analyzer") == analyzer
    assert "mock_analyzer" in registry.list_analyzers()

def test_register_invalid_analyzer():
    registry = ToolRegistry()
    
    class InvalidAnalyzer:
        pass
    
    with pytest.raises(ValueError):
        registry.register_analyzer("invalid", InvalidAnalyzer()) 