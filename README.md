# AI2SQL

An AI-powered SQL IDE that converts natural language to SQL queries.

## Project Structure 

## Architecture

### Core Components

1. **Chat Management (`core/chat/`)**
   - Manages AI interactions using OpenAI's API
   - Maintains conversation context
   - Handles system prompts and tool calls

2. **Tool System (`core/tools/`)**
   - Provides function calling capabilities for AI
   - SQL analysis and validation tools
   - Extensible tool registry system

3. **Rule Engine (`core/rules/`)**
   - SQL best practices validation
   - Dialect-specific rules
   - Multi-level rule configuration:
     - Default rules (package)
     - User rules (`~/.ai2sqlrules`)
     - Project rules (`.ai2sqlrules`)

4. **Schema Management (`core/schema/`)**
    - Local schema definition support
    - Table and column information
    - Schema loading from YAML files
    - Multiple schema sources:
      - Project schema files
      - Database connections

5. **Editor Session (`editor/`)**
   - Manages user interaction sessions
   - Handles input/output
   - Maintains session history

### Supporting Components

1. **Configuration System (`utils/config.py`)**
   - Hierarchical configuration:
     - Package defaults
     - User config (`~/.ai2sqlconfig`)
     - Project config (`.ai2sqlconfig`)
   - Environment variable support
   - Runtime configuration

2. **CLI Utilities (`utils/cli.py`)**
   - Rich command-line interface
   - Command history management
   - Formatted output handling
   - Error and warning displays

### Data Flow

1. **Input Processing**
   ```
   User Input -> CLI -> Editor Session -> Chat Manager -> OpenAI API
   ```

2. **SQL Generation**
   ```
   OpenAI API -> Tool Calls -> SQL Analysis -> Rule Validation -> Formatted Output
   ```

3. **Configuration Loading**
   ```
   Default Config -> User Config -> Project Config -> Runtime Config
   ```

## Configuration

### Default Configuration

```yaml
# Default settings in package
model: gpt-3.5-turbo
dialect: mysql
history_size: 1000
theme: monokai
```

### User Configuration
```yaml
# ~/.ai2sqlconfig
model: gpt-4
dialect: postgresql
theme: dracula
```

### Project Configuration
```yaml
# .ai2sqlconfig
dialect: hive
history_size: 2000
```

## Schema Management

### Schema Definition
```yaml
# tables.yml
tables:
  - name: users
    comment: "User information table"
    columns:
      - name: id
        type: bigint
        nullable: false
        comment: "User ID"
      - name: username
        type: varchar(50)
        comment: "User's login name"
      - name: created_at
        type: timestamp
        comment: "Account creation time"

- name: orders
  comment: "Order information"
  columns:
    - name: order_id
      type: bigint
      nullable: false
      comment: "Order ID"
    - name: user_id
      type: bigint
      comment: "Reference to users.id"
    - name: total_amount
      type: decimal(10,2)
      comment: "Order total amount"
```

### Loading Schema
```bash
# Load from project schema file
ai2sql --schema ./tables.yml

# Load from multiple files
ai2sql --schema ./users.yml --schema ./orders.yml
```

## Rule System

### Rule Definition
```yaml
rules:
  - name: avoid_select_star
    description: "Avoid using SELECT * in production queries"
    pattern: "SELECT\\s+\\*"
    suggestion: "Explicitly specify the columns you need"
    dialect: all
    severity: warning
```

### Rule Locations
1. Package Default Rules
   - Basic SQL best practices
   - Common dialect-specific rules

2. User Rules (`~/.ai2sqlrules`)
   - Personal preferences
   - Custom validations

3. Project Rules (`.ai2sqlrules`)
   - Project-specific requirements
   - Team conventions

## Development

### Adding New Features

1. **New SQL Dialect**
   - Add dialect-specific rules
   - Implement dialect-specific tools
   - Update configuration options

2. **New Tools**
   - Create tool in `core/tools/`
   - Register in tool registry
   - Update system prompts

3. **New Rules**
   - Define rule pattern
   - Add to appropriate rule file
   - Implement validation logic

### Testing

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run specific test
pytest tests/test_rules.py
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 
