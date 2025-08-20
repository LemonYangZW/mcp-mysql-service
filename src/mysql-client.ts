/**
 * MySQL客户端 - 简化版本
 * 提供基础的数据库连接和查询功能
 */

import mysql from 'mysql2/promise';
import { MCPMySQL } from './types/mcp.js';

export class MySQLClient {
  private pool: mysql.Pool | null = null;
  private config: MCPMySQL.DatabaseConfig;

  constructor(config: MCPMySQL.DatabaseConfig) {
    this.config = config;
  }

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: this.config.pool.connectionLimit,
        queueLimit: this.config.pool.queueLimit,
        charset: this.config.charset || 'utf8mb4',
        timezone: this.config.timezone || '+00:00'
      });

      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
    } catch (error) {
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * 执行查询
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<MCPMySQL.QueryResult<T>> {
    if (!this.pool) {
      throw new Error('数据库未连接');
    }

    const startTime = Date.now();
    
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      const executionTime = Date.now() - startTime;

      return {
        rows: rows as T[],
        fields: fields.map(field => ({
          name: field.name,
          type: (field.type as any) as MCPMySQL.MySQLDataType,
          length: field.length,
          nullable: !field.flags || !(field.flags as any & 1),
          defaultValue: null,
          comment: '',
          extra: ''
        })),
        executionTime,
        rowCount: Array.isArray(rows) ? rows.length : 0
      };
    } catch (error) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }

  /**
   * 获取表列表
   */
  async listTables(): Promise<string[]> {
    const result = await this.query<{ TABLE_NAME: string }>(
      'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME',
      [this.config.database]
    );
    return result.rows.map(row => row.TABLE_NAME);
  }

  /**
   * 获取表结构
   */
  async getTableStructure(tableName: string): Promise<MCPMySQL.TableStructure> {
    // 获取表信息
    const tableInfo = await this.query<any>(
      `SELECT TABLE_COMMENT, ENGINE, TABLE_COLLATION, CREATE_TIME, UPDATE_TIME 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [this.config.database, tableName]
    );

    if (tableInfo.rows.length === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 获取列信息
    const columns = await this.query<any>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, 
              COLUMN_COMMENT, EXTRA, ORDINAL_POSITION,
              CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? 
       ORDER BY ORDINAL_POSITION`,
      [this.config.database, tableName]
    );

    return {
      tableName,
      tableComment: tableInfo.rows[0].TABLE_COMMENT || '',
      engine: tableInfo.rows[0].ENGINE as MCPMySQL.MySQLEngine,
      charset: 'utf8mb4',
      collation: tableInfo.rows[0].TABLE_COLLATION || '',
      createTime: tableInfo.rows[0].CREATE_TIME?.toISOString() || '',
      updateTime: tableInfo.rows[0].UPDATE_TIME?.toISOString(),
      columns: columns.rows.map(col => ({
        columnName: col.COLUMN_NAME,
        dataType: col.DATA_TYPE?.toUpperCase() as MCPMySQL.MySQLDataType,
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        numericPrecision: col.NUMERIC_PRECISION,
        numericScale: col.NUMERIC_SCALE,
        isNullable: col.IS_NULLABLE === 'YES',
        columnDefault: col.COLUMN_DEFAULT,
        columnComment: col.COLUMN_COMMENT || '',
        extra: col.EXTRA || '',
        position: col.ORDINAL_POSITION
      }))
    };
  }

  /**
   * 获取表统计信息
   */
  async getTableStats(tableName: string): Promise<MCPMySQL.TableStats> {
    const stats = await this.query<any>(
      `SELECT TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, INDEX_LENGTH,
              AUTO_INCREMENT, CREATE_TIME, UPDATE_TIME
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [this.config.database, tableName]
    );

    if (stats.rows.length === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    const row = stats.rows[0];
    return {
      tableName,
      totalRows: row.TABLE_ROWS || 0,
      avgRowSize: row.AVG_ROW_LENGTH || 0,
      dataLength: row.DATA_LENGTH || 0,
      indexLength: row.INDEX_LENGTH || 0,
      autoIncrement: row.AUTO_INCREMENT,
      createTime: row.CREATE_TIME?.toISOString() || '',
      updateTime: row.UPDATE_TIME?.toISOString(),
      lastAnalyzed: new Date().toISOString()
    };
  }

  /**
   * 分析列数据
   */
  async analyzeColumn(tableName: string, columnName: string, analysisType: MCPMySQL.AnalysisType): Promise<MCPMySQL.ColumnAnalysis> {
    let result: any = {};

    try {
      switch (analysisType) {
        case MCPMySQL.AnalysisType.DISTRIBUTION:
          const distResult = await this.query<any>(
            `SELECT ${columnName} as value, COUNT(*) as count 
             FROM ${tableName} 
             WHERE ${columnName} IS NOT NULL 
             GROUP BY ${columnName} 
             ORDER BY count DESC 
             LIMIT 20`
          );
          
          const total = await this.query<any>(`SELECT COUNT(*) as total FROM ${tableName} WHERE ${columnName} IS NOT NULL`);
          const totalCount = total.rows[0].total;

          result.distribution = distResult.rows.map(row => ({
            value: row.value,
            count: row.count,
            percentage: (row.count / totalCount) * 100
          }));
          break;

        case MCPMySQL.AnalysisType.NULLS:
          const nullStats = await this.query<any>(
            `SELECT 
               COUNT(*) as total_rows,
               SUM(CASE WHEN ${columnName} IS NULL THEN 1 ELSE 0 END) as null_rows
             FROM ${tableName}`
          );
          
          const nullRow = nullStats.rows[0];
          result.nullAnalysis = {
            totalRows: nullRow.total_rows,
            nullRows: nullRow.null_rows,
            nullPercentage: (nullRow.null_rows / nullRow.total_rows) * 100
          };
          break;

        case MCPMySQL.AnalysisType.UNIQUE:
          const uniqueStats = await this.query<any>(
            `SELECT 
               COUNT(*) as total_rows,
               COUNT(DISTINCT ${columnName}) as unique_rows
             FROM ${tableName}
             WHERE ${columnName} IS NOT NULL`
          );
          
          const uniqueRow = uniqueStats.rows[0];
          result.uniqueAnalysis = {
            totalRows: uniqueRow.total_rows,
            uniqueRows: uniqueRow.unique_rows,
            uniquePercentage: (uniqueRow.unique_rows / uniqueRow.total_rows) * 100
          };
          break;
      }

      return {
        analysisType,
        columnName,
        tableName,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`列分析失败: ${error.message}`);
    }
  }

  /**
   * 测试连接状态
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch {
      return false;
    }
  }
}