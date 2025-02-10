import pytest
from ai2sql.core.tools.sql_analyzer import SQLAnalyzer

def test_valid_sql_analysis():
    analyzer = SQLAnalyzer()
    sql = "SELECT id, name FROM users WHERE age > 18"
    
    result = analyzer.analyze(sql)
    
    assert result['is_valid']
    assert result['parsed'] is not None
    assert result['formatted'] is not None
    assert result['dialect'] == 'mysql'
    assert result['tokens'] is not None
    assert result['type'] == 'SELECT'

def test_invalid_sql_analysis():
    analyzer = SQLAnalyzer()
    sql = "SELECT * FROM"  # 无效的SQL
    
    result = analyzer.analyze(sql)
    
    assert not result['is_valid']
    assert result['error'] is not None

def test_sql_formatting():
    analyzer = SQLAnalyzer()
    sql = "SELECT id,name FROM users WHERE age>18"
    
    formatted = analyzer.format_sql(sql)
    
    assert 'SELECT' in formatted
    assert 'FROM' in formatted
    assert 'WHERE' in formatted
    assert '\n' in formatted

def test_format_error_handling():
    analyzer = SQLAnalyzer()
    
    with pytest.raises(ValueError):
        analyzer.format_sql("NOT A SQL QUERY")

def test_dialect_translation():
    analyzer = SQLAnalyzer()
    mysql_sql = "SELECT `id`, `name` FROM `users` LIMIT 5"
    
    # 转换到 PostgreSQL
    pg_sql = analyzer.translate(mysql_sql, 'mysql', 'postgres')
    assert '"id"' in pg_sql  # PostgreSQL 使用双引号
    assert '"name"' in pg_sql
    assert '"users"' in pg_sql
    
    # 转换到 SQLite
    sqlite_sql = analyzer.translate(mysql_sql, 'mysql', 'sqlite')
    assert '`' not in sqlite_sql  # SQLite 不使用反引号

def test_translation_error_handling():
    analyzer = SQLAnalyzer()
    
    with pytest.raises(ValueError):
        analyzer.translate("NOT A SQL", 'mysql', 'postgres') 