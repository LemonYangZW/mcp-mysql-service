/**
 * 基础测试
 */

import { Logger } from '../src/utils/logger.js';
import { ConfigManager } from '../src/utils/config.js';

describe('基础功能测试', () => {
  test('Logger应该能够正常工作', () => {
    const logger = Logger.getInstance();
    expect(logger).toBeDefined();
    
    // 测试日志方法（不应该抛出错误）
    expect(() => {
      logger.info('测试信息');
      logger.error('测试错误');
      logger.warn('测试警告');
      logger.debug('测试调试');
    }).not.toThrow();
  });

  test('ConfigManager应该能够获取数据库配置', () => {
    const configManager = ConfigManager.getInstance();
    expect(configManager).toBeDefined();
    
    const dbConfig = configManager.getDatabaseConfig();
    expect(dbConfig).toBeDefined();
    expect(dbConfig.host).toBeDefined();
    expect(dbConfig.port).toBeGreaterThan(0);
    expect(dbConfig.database).toBeDefined();
    expect(dbConfig.username).toBeDefined();
    expect(typeof dbConfig.password).toBe('string');
  });

  test('应该能够导入MCPMySQL类型', async () => {
    const { MCPMySQL } = await import('../src/types/mcp.js');
    expect(MCPMySQL).toBeDefined();
    expect(MCPMySQL.ErrorType).toBeDefined();
    expect(MCPMySQL.AnalysisType).toBeDefined();
  });
});