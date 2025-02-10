#!/bin/bash

# 设置测试环境变量
export AI2SQL_MODEL="deepseek-r1"
export AI2SQL_DIALECT="hive"

# 运行交互式测试
echo "Testing interactive mode..."
echo "查询用户表的所有数据" | ai2sql shell --schema tests/data/test_schema.yml

# 测试不同的方言
echo "Testing with different dialects..."
echo "统计用户订单数量" | ai2sql shell --schema tests/data/test_schema.yml --dialect postgres

# 测试错误处理
echo "Testing error handling..."
echo "查询不存在的表" | ai2sql shell --schema tests/data/test_schema.yml 