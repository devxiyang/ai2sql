import pytest
from ai2sql.core.schema import SchemaManager

def test_schema_loading():
    manager = SchemaManager()
    
    # Test schema data
    test_schema = {
        'tables': [{
            'name': 'users',
            'columns': [
                {'name': 'id', 'type': 'bigint'},
                {'name': 'name', 'type': 'varchar(50)'}
            ]
        }]
    }
    
    manager._process_schema(test_schema)
    
    # Verify table info
    table_info = manager.get_table_info('users')
    assert table_info is not None
    assert table_info['name'] == 'users'
    
    # Verify column info
    column_info = manager.get_column_info('users', 'id')
    assert column_info is not None
    assert column_info['type'] == 'bigint' 