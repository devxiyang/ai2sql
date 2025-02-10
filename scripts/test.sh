#!/bin/bash

# 运行所有测试
poetry run pytest

# 运行特定测试
poetry run pytest tests/test_integration.py -v

# 运行交互式测试
poetry run ai2sql shell --schema tests/data/test_schema.yml 