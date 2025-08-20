/**
 * 测试环境设置文件 - 全局测试配置
 * 用于配置Jest测试环境，提供Mock对象和测试工具函数
 *
 * @author WMS Cloud Team
 * @version 1.0.0
 */
import 'jest-extended';
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidDate(): R;
            toBeValidUUID(): R;
            toBeValidMySQLDataType(): R;
            toHaveValidDatabaseStructure(): R;
            toBeSecureQuery(): R;
        }
    }
    function sleep(ms: number): Promise<void>;
    function createTestDatabaseConfig(): any;
    function randomString(length?: number): string;
    function generateTestTableName(): string;
    function isEmpty(obj: any): boolean;
    function deepClone<T>(obj: T): T;
}
/**
 * 测试数据工厂类 - 用于生成各种测试数据
 */
export declare class TestDataFactory {
    /**
     * 创建测试用的表结构数据
     */
    static createTableStructure(overrides?: Partial<any>): any;
    /**
     * 创建测试用的查询结果数据
     */
    static createQueryResult<T = any>(data?: T[], overrides?: Partial<any>): any;
    /**
     * 创建测试用的MCP响应数据
     */
    static createMCPResponse<T = any>(data?: T, success?: boolean): any;
    /**
     * 创建测试用的数据库配置
     */
    static createDatabaseConfig(overrides?: Partial<any>): any;
}
export declare const sleep: typeof global.sleep;
export declare const createTestDatabaseConfig: typeof global.createTestDatabaseConfig;
export declare const randomString: typeof global.randomString;
export declare const generateTestTableName: typeof global.generateTestTableName;
export declare const isEmpty: typeof global.isEmpty;
export declare const deepClone: typeof global.deepClone;
