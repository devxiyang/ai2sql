import pytest
from ai2sql.core.tools.sql_analyzer import SQLAnalyzer

def test_simple_select_analysis():
    analyzer = SQLAnalyzer()
    sql = "SELECT id, name FROM users WHERE age > 18"
    
    result = analyzer.analyze(sql)
    
    assert 'users' in result['tables']
    assert len(result['conditions']) == 1
    assert 'id' in result['columns']['unknown']
    assert 'name' in result['columns']['unknown']

def test_sql_formatting():
    analyzer = SQLAnalyzer()
    sql = "SELECT id,name FROM users WHERE age>18 AND status='active'"
    
    formatted = analyzer.format_sql(sql)
    
    assert 'SELECT' in formatted
    assert 'FROM' in formatted
    assert 'WHERE' in formatted
    assert '\n' in formatted  # Should include line breaks

def test_error_handling():
    analyzer = SQLAnalyzer()
    
    with pytest.raises(ValueError):
        analyzer.analyze("SELECT * FROM")  # Invalid SQL
    
    with pytest.raises(ValueError):
        analyzer.format_sql("NOT A SQL QUERY") 