/**
 * 简化的配置管理器
 */

import { MCPMySQL } from '../types/mcp.js';

export class ConfigManager {
  private static instance: ConfigManager;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getDatabaseConfig(): MCPMySQL.DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'ruoyi-vue-pro',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      pool: {
        connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10'),
        queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000'),
        timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
        reconnect: true
      }
    };
  }
}