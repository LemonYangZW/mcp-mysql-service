#!/usr/bin/env bash

# MCP MySQL服务测试运行脚本
echo "=== MCP MySQL服务测试套件 ==="
echo "开始运行测试..."

# 设置测试环境变量
export NODE_ENV=test
export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
export TEST_DB_PORT=${TEST_DB_PORT:-3306}
export TEST_DB_USER=${TEST_DB_USER:-root}
export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-}
export TEST_DB_NAME=${TEST_DB_NAME:-test_mcp_mysql}

echo "数据库配置: $TEST_DB_HOST:$TEST_DB_PORT/$TEST_DB_NAME (用户: $TEST_DB_USER)"

# 检查参数
case "${1:-all}" in
    "unit")
        echo "运行单元测试..."
        npm run test:unit
        ;;
    "integration")
        echo "运行集成测试..."
        npm run test:integration
        ;;
    "e2e")
        echo "运行端到端测试..."
        npm run test:e2e
        ;;
    "security")
        echo "运行安全测试..."
        npm run test:security
        ;;
    "coverage")
        echo "生成覆盖率报告..."
        npm run test:coverage
        ;;
    "basic")
        echo "运行基础测试..."
        npm run test:basic
        ;;
    "all"|"")
        echo "运行完整测试套件..."
        echo "1. 基础测试..."
        npm run test:basic
        echo "2. 单元测试..."
        npm run test:unit
        echo "3. 集成测试..."
        npm run test:integration
        echo "4. 端到端测试..."
        npm run test:e2e
        echo "5. 安全测试..."
        npm run test:security
        echo "6. 生成覆盖率..."
        npm run test:coverage
        ;;
    *)
        echo "用法: $0 [unit|integration|e2e|security|coverage|basic|all]"
        exit 1
        ;;
esac

echo "测试完成！"
