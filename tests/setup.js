/**
 * 测试环境设置文件 - 全局测试配置
 * 用于配置Jest测试环境，提供Mock对象和测试工具函数
 *
 * @author WMS Cloud Team
 * @version 1.0.0
 */
import 'jest-extended';
import { config } from 'dotenv';
// ============================================================================
// 环境配置
// ============================================================================
// 加载测试环境变量
config({ path: '.env.test' });
// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出
// ============================================================================
// 全局Mock配置
// ============================================================================
// Mock Winston Logger以避免测试时的日志输出
jest.mock('winston', () => ({
    createLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        child: jest.fn(() => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            log: jest.fn(),
        }))
    })),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        errors: jest.fn(),
        json: jest.fn(),
        colorize: jest.fn(),
        simple: jest.fn(),
        printf: jest.fn()
    },
    transports: {
        Console: jest.fn(),
        File: jest.fn()
    }
}));
// ============================================================================
// 全局测试工具函数
// ============================================================================
/**
 * 等待指定时间
 */
global.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
/**
 * 创建测试数据库配置
 */
global.createTestDatabaseConfig = () => ({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    database: process.env.TEST_DB_NAME || 'test_mcp_mysql',
    username: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    pool: {
        connectionLimit: 5,
        queueLimit: 0,
        acquireTimeout: 10000,
        timeout: 10000,
        reconnect: true
    }
});
/**
 * 生成随机字符串
 */
global.randomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
/**
 * 生成测试表名
 */
global.generateTestTableName = () => {
    return `test_table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
/**
 * 检查对象是否为空
 */
global.isEmpty = (obj) => {
    return obj === null || obj === undefined ||
        (typeof obj === 'object' && Object.keys(obj).length === 0) ||
        (typeof obj === 'string' && obj.trim().length === 0) ||
        (Array.isArray(obj) && obj.length === 0);
};
/**
 * 深度克隆对象
 */
global.deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        Object.keys(obj).forEach(key => {
            clonedObj[key] = deepClone(obj[key]);
        });
        return clonedObj;
    }
    return obj;
};
// 自定义匹配器
expect.extend({
    /**
     * 验证是否为有效日期
     */
    toBeValidDate(received) {
        const pass = received instanceof Date && !isNaN(received.getTime());
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid date`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid date`,
                pass: false,
            };
        }
    },
    /**
     * 验证是否为有效UUID
     */
    toBeValidUUID(received) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const pass = typeof received === 'string' && uuidRegex.test(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid UUID`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid UUID`,
                pass: false,
            };
        }
    },
    /**
     * 验证是否为有效的MySQL数据类型
     */
    toBeValidMySQLDataType(received) {
        const validTypes = [
            'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT',
            'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL', 'BIT', 'BOOLEAN',
            'SERIAL', 'CHAR', 'VARCHAR', 'BINARY', 'VARBINARY', 'TINYTEXT',
            'TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'TINYBLOB', 'BLOB', 'MEDIUMBLOB',
            'LONGBLOB', 'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR', 'JSON',
            'GEOMETRY', 'POINT', 'LINESTRING', 'POLYGON'
        ];
        const pass = typeof received === 'string' && validTypes.includes(received.toUpperCase());
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid MySQL data type`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid MySQL data type`,
                pass: false,
            };
        }
    },
    /**
     * 验证数据库结构对象
     */
    toHaveValidDatabaseStructure(received) {
        const hasRequiredFields = received &&
            typeof received.tableName === 'string' &&
            Array.isArray(received.columns) &&
            received.columns.length > 0;
        if (hasRequiredFields) {
            return {
                message: () => `expected object not to have valid database structure`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected object to have valid database structure with tableName and columns`,
                pass: false,
            };
        }
    },
    /**
     * 验证是否为安全查询
     */
    toBeSecureQuery(received) {
        const isString = typeof received === 'string';
        const startsWithSelect = isString && received.trim().toLowerCase().startsWith('select');
        const noForbiddenKeywords = isString && !/(insert|update|delete|drop|create|alter|truncate)/i.test(received);
        const pass = isString && startsWithSelect && noForbiddenKeywords;
        if (pass) {
            return {
                message: () => `expected "${received}" not to be a secure query`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected "${received}" to be a secure SELECT query without forbidden keywords`,
                pass: false,
            };
        }
    }
});
// ============================================================================
// 测试生命周期钩子
// ============================================================================
beforeAll(async () => {
    // 测试开始前的全局设置
    console.log('🧪 开始运行测试套件...');
    // 设置时区为UTC以保证测试一致性
    process.env.TZ = 'UTC';
});
afterAll(async () => {
    // 测试结束后的清理工作
    console.log('✅ 测试套件执行完成');
    // 清理可能存在的定时器
    jest.clearAllTimers();
    // 强制垃圾回收（如果可用）
    if (global.gc) {
        global.gc();
    }
});
beforeEach(() => {
    // 每个测试前重置Mock状态
    jest.clearAllMocks();
});
afterEach(() => {
    // 每个测试后的清理工作
    jest.restoreAllMocks();
});
// ============================================================================
// 错误处理
// ============================================================================
// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // 在测试环境中，我们希望测试失败而不是默默忽略错误
    throw reason;
});
// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    throw error;
});
// ============================================================================
// 测试数据工厂
// ============================================================================
/**
 * 测试数据工厂类 - 用于生成各种测试数据
 */
export class TestDataFactory {
    /**
     * 创建测试用的表结构数据
     */
    static createTableStructure(overrides = {}) {
        return {
            tableName: 'test_users',
            tableComment: '测试用户表',
            engine: 'InnoDB',
            charset: 'utf8mb4',
            collation: 'utf8mb4_unicode_ci',
            createTime: new Date().toISOString(),
            columns: [
                {
                    columnName: 'id',
                    dataType: 'BIGINT',
                    isNullable: false,
                    columnDefault: null,
                    columnComment: '主键ID',
                    extra: 'auto_increment',
                    position: 1
                },
                {
                    columnName: 'username',
                    dataType: 'VARCHAR',
                    maxLength: 50,
                    isNullable: false,
                    columnDefault: null,
                    columnComment: '用户名',
                    extra: '',
                    position: 2
                }
            ],
            indexes: [
                {
                    indexName: 'PRIMARY',
                    columnNames: ['id'],
                    indexType: 'BTREE',
                    isUnique: true,
                    isPrimary: true,
                    comment: '主键索引'
                }
            ],
            ...overrides
        };
    }
    /**
     * 创建测试用的查询结果数据
     */
    static createQueryResult(data = [], overrides = {}) {
        return {
            rows: data,
            fields: [
                {
                    name: 'id',
                    type: 'BIGINT',
                    nullable: false,
                    defaultValue: null,
                    comment: '主键ID',
                    extra: 'auto_increment'
                }
            ],
            executionTime: 10,
            rowCount: data.length,
            ...overrides
        };
    }
    /**
     * 创建测试用的MCP响应数据
     */
    static createMCPResponse(data, success = true) {
        return {
            success,
            data,
            error: success ? undefined : {
                code: 'TEST_ERROR',
                message: '测试错误',
                type: 'SYSTEM_ERROR'
            },
            metadata: {
                timestamp: new Date().toISOString(),
                executionTime: 10
            }
        };
    }
    /**
     * 创建测试用的数据库配置
     */
    static createDatabaseConfig(overrides = {}) {
        return {
            host: 'localhost',
            port: 3306,
            database: 'test_db',
            username: 'test_user',
            password: 'test_password',
            pool: {
                connectionLimit: 5,
                queueLimit: 0,
                acquireTimeout: 10000,
                timeout: 10000,
                reconnect: true
            },
            ...overrides
        };
    }
}
// 导出测试工具
export const sleep = global.sleep;
export const createTestDatabaseConfig = global.createTestDatabaseConfig;
export const randomString = global.randomString;
export const generateTestTableName = global.generateTestTableName;
export const isEmpty = global.isEmpty;
export const deepClone = global.deepClone;
//# sourceMappingURL=setup.js.map