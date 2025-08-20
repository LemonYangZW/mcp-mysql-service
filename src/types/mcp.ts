// MCP MySQL Service - Complete Type Definitions
// 完整的MCP协议类型定义

import { z } from 'zod';
import * as mysql from 'mysql2/promise';

// ============================================================================
// 核心MCP协议类型定义
// ============================================================================

export namespace MCPMySQL {
  // 基础MCP协议类型
  export interface MCPRequest<T = Record<string, unknown>> {
    readonly toolName: string;
    readonly parameters: Readonly<T>;
    readonly requestId: string;
    readonly timestamp: string;
  }

  export interface MCPResponse<T = unknown> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: Readonly<MCPError>;
    readonly metadata: Readonly<ResponseMetadata>;
  }

  export interface MCPError {
    readonly code: string;
    readonly message: string;
    readonly type: ErrorType;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly stack?: string;
  }

  export interface ResponseMetadata {
    readonly timestamp: string;
    readonly executionTime: number;
    readonly queryInfo?: {
      readonly sql?: string;
      readonly affectedRows?: number;
      readonly warningCount?: number;
    };
  }

  // MCP工具定义类型
  export interface MCPToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Readonly<JSONSchema>;
    readonly outputSchema?: Readonly<JSONSchema>;
  }

  // JSON Schema定义
  export interface JSONSchema {
    readonly type: string;
    readonly properties?: Record<string, JSONSchemaProperty>;
    readonly required?: readonly string[];
    readonly additionalProperties?: boolean;
  }

  export interface JSONSchemaProperty {
    readonly type: string;
    readonly description?: string;
    readonly default?: unknown;
    readonly enum?: readonly unknown[];
    readonly minimum?: number;
    readonly maximum?: number;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly pattern?: string;
    readonly items?: JSONSchemaProperty;
  }

  // ============================================================================
  // 数据库相关类型定义
  // ============================================================================

  // 数据库配置类型
  export interface DatabaseConfig {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly username: string;
    readonly password: string;
    readonly ssl?: Readonly<SSLConfig>;
    readonly pool: Readonly<PoolConfig>;
    readonly charset?: string;
    readonly timezone?: string;
  }

  export interface SSLConfig {
    readonly enabled: boolean;
    readonly rejectUnauthorized?: boolean;
    readonly ca?: string;
    readonly cert?: string;
    readonly key?: string;
  }

  export interface PoolConfig {
    readonly connectionLimit: number;
    readonly queueLimit: number;
    readonly acquireTimeout: number;
    readonly timeout: number;
    readonly reconnect: boolean;
  }

  // 查询结果类型
  export interface QueryResult<T = Record<string, unknown>> {
    readonly rows: ReadonlyArray<T>;
    readonly fields: ReadonlyArray<FieldInfo>;
    readonly executionTime: number;
    readonly rowCount: number;
    readonly metadata?: Readonly<QueryMetadata>;
  }

  export interface FieldInfo {
    readonly name: string;
    readonly type: MySQLDataType;
    readonly length?: number;
    readonly nullable: boolean;
    readonly defaultValue?: string | null;
    readonly comment: string;
    readonly extra: string;
  }

  export interface QueryMetadata {
    readonly affectedRows: number;
    readonly insertId: number;
    readonly warningCount: number;
    readonly changedRows: number;
  }

  // 表结构相关类型
  export interface TableStructure {
    readonly tableName: string;
    readonly tableComment: string;
    readonly engine: MySQLEngine;
    readonly charset: string;
    readonly collation: string;
    readonly createTime: string;
    readonly updateTime?: string;
    readonly columns: ReadonlyArray<ColumnInfo>;
    readonly indexes?: ReadonlyArray<IndexInfo>;
    readonly foreignKeys?: ReadonlyArray<ForeignKeyInfo>;
    readonly constraints?: ReadonlyArray<ConstraintInfo>;
  }

  export interface ColumnInfo {
    readonly columnName: string;
    readonly dataType: MySQLDataType;
    readonly maxLength?: number;
    readonly numericPrecision?: number;
    readonly numericScale?: number;
    readonly isNullable: boolean;
    readonly columnDefault?: string | null;
    readonly columnComment: string;
    readonly extra: string;
    readonly position: number;
  }

  export interface IndexInfo {
    readonly indexName: string;
    readonly columnNames: ReadonlyArray<string>;
    readonly indexType: IndexType;
    readonly isUnique: boolean;
    readonly isPrimary: boolean;
    readonly cardinality?: number;
    readonly subPart?: number;
    readonly comment: string;
  }

  export interface ForeignKeyInfo {
    readonly constraintName: string;
    readonly columnName: string;
    readonly referencedTableName: string;
    readonly referencedColumnName: string;
    readonly onUpdate: ReferentialAction;
    readonly onDelete: ReferentialAction;
  }

  export interface ConstraintInfo {
    readonly constraintName: string;
    readonly constraintType: ConstraintType;
    readonly columnNames: ReadonlyArray<string>;
    readonly checkClause?: string;
  }

  // 表统计信息类型
  export interface TableStats {
    readonly tableName: string;
    readonly totalRows: number;
    readonly avgRowSize: number;
    readonly dataLength: number;
    readonly indexLength: number;
    readonly autoIncrement?: number;
    readonly createTime: string;
    readonly updateTime?: string;
    readonly lastAnalyzed: string;
    readonly columnStats?: ReadonlyArray<ColumnStats>;
    readonly dataSample?: ReadonlyArray<Record<string, unknown>>;
  }

  export interface ColumnStats {
    readonly columnName: string;
    readonly nullCount: number;
    readonly uniqueCount: number;
    readonly minValue?: string | number;
    readonly maxValue?: string | number;
    readonly avgLength?: number;
    readonly dataDistribution?: ReadonlyArray<ValueDistribution>;
  }

  export interface ValueDistribution {
    readonly value: unknown;
    readonly count: number;
    readonly percentage: number;
  }

  // 字段分析结果类型
  export interface ColumnAnalysis {
    readonly analysisType: AnalysisType;
    readonly columnName: string;
    readonly tableName: string;
    readonly result: AnalysisResult;
    readonly timestamp: string;
  }

  export interface AnalysisResult {
    readonly distribution?: ReadonlyArray<ValueDistribution>;
    readonly nullAnalysis?: NullAnalysis;
    readonly uniqueAnalysis?: UniqueAnalysis;
    readonly rangeAnalysis?: RangeAnalysis;
    readonly totalUniqueValues?: number;
  }

  export interface NullAnalysis {
    readonly totalRows: number;
    readonly nullRows: number;
    readonly nullPercentage: number;
  }

  export interface UniqueAnalysis {
    readonly totalRows: number;
    readonly uniqueRows: number;
    readonly uniquePercentage: number;
    readonly duplicateGroups?: ReadonlyArray<DuplicateGroup>;
  }

  export interface DuplicateGroup {
    readonly value: unknown;
    readonly count: number;
  }

  export interface RangeAnalysis {
    readonly minValue: string | number;
    readonly maxValue: string | number;
    readonly avgValue?: number;
    readonly medianValue?: number;
    readonly standardDeviation?: number;
  }

  // ============================================================================
  // 安全相关类型定义
  // ============================================================================

  export interface SecurityContext {
    readonly allowedTables: ReadonlySet<string>;
    readonly deniedTables: ReadonlySet<string>;
    readonly maxQueryTime: number;
    readonly maxResultRows: number;
    readonly enableDataMasking: boolean;
    readonly sensitiveColumns: ReadonlyArray<string>;
    readonly maskingRules: ReadonlyArray<MaskingRule>;
  }

  export interface MaskingRule {
    readonly columnPattern: RegExp;
    readonly maskingStrategy: MaskingStrategy;
    readonly preserveLength: boolean;
    readonly customMaskChar?: string;
  }

  export interface AccessControlConfig {
    readonly allowedTables?: ReadonlyArray<string>;
    readonly deniedTables?: ReadonlyArray<string>;
    readonly tableWhitelist?: ReadonlyArray<string>;
    readonly tableBlacklist?: ReadonlyArray<string>;
    readonly maxQueryTime: number;
    readonly maxResultRows: number;
  }

  // ============================================================================
  // 高级功能类型定义
  // ============================================================================

  // SQL执行计划类型
  export interface ExecutionPlan {
    readonly query: string;
    readonly planSteps: ReadonlyArray<PlanStep>;
    readonly totalCost: number;
    readonly estimatedRows: number;
    readonly optimizationSuggestions: ReadonlyArray<string>;
  }

  export interface PlanStep {
    readonly step: number;
    readonly operation: OperationType;
    readonly table?: string;
    readonly index?: string;
    readonly cost: number;
    readonly rows: number;
    readonly details?: Readonly<Record<string, unknown>>;
  }

  export interface PerformanceAnalysis {
    readonly executionPlan: ExecutionPlan;
    readonly queryStats: QueryStatistics;
    readonly optimizationSuggestions: ReadonlyArray<OptimizationSuggestion>;
    readonly performanceScore: number; // 0-100分
  }

  export interface OptimizationSuggestion {
    readonly type: OptimizationType;
    readonly priority: Priority;
    readonly description: string;
    readonly suggestedAction: string;
    readonly estimatedImprovement?: string;
  }

  export interface QueryStatistics {
    readonly executionTime: number;
    readonly rowsExamined: number;
    readonly rowsReturned: number;
    readonly indexesUsed: ReadonlyArray<string>;
    readonly temporaryTablesCreated: number;
    readonly sortOperations: number;
    readonly keyReads: number;
    readonly keyReadRequests: number;
  }

  // 性能监控类型
  export interface PerformanceMetrics {
    readonly avgQueryTime: number;
    readonly slowQueryCount: number;
    readonly indexHitRatio: number;
    readonly lockWaitTime: number;
    readonly connectionPoolUsage: number;
    readonly cacheHitRatio: number;
    readonly errorRate: number;
    readonly throughput: number;
  }

  export interface QueryPerformanceMetrics {
    readonly query: string;
    readonly executionTime: number;
    readonly memoryDelta: MemoryDelta;
    readonly rowsExamined: number;
    readonly rowsReturned: number;
    readonly indexesUsed: ReadonlyArray<string>;
    readonly cacheHits: number;
    readonly timestamp: string;
  }

  export interface MemoryDelta {
    readonly rss: number;
    readonly heapUsed: number;
    readonly heapTotal: number;
    readonly external: number;
  }

  // 缓存相关类型
  export interface CacheEntry {
    readonly data: unknown;
    readonly createdAt: number;
    readonly expiresAt: number;
    lastAccessed: number;
    hitCount: number;
    readonly size: number;
  }

  export interface CacheStatistics {
    readonly hits: number;
    readonly misses: number;
    readonly stores: number;
    readonly evictions: number;
    readonly expiries: number;
    readonly hitRatio: number;
    readonly currentSize: number;
    readonly maxSize: number;
    readonly memoryUsage: number;
  }

  // ============================================================================
  // 枚举类型定义
  // ============================================================================

  export enum MySQLDataType {
    TINYINT = 'TINYINT',
    SMALLINT = 'SMALLINT',
    MEDIUMINT = 'MEDIUMINT',
    INT = 'INT',
    INTEGER = 'INTEGER',
    BIGINT = 'BIGINT',
    DECIMAL = 'DECIMAL',
    NUMERIC = 'NUMERIC',
    FLOAT = 'FLOAT',
    DOUBLE = 'DOUBLE',
    REAL = 'REAL',
    BIT = 'BIT',
    BOOLEAN = 'BOOLEAN',
    SERIAL = 'SERIAL',
    CHAR = 'CHAR',
    VARCHAR = 'VARCHAR',
    BINARY = 'BINARY',
    VARBINARY = 'VARBINARY',
    TINYTEXT = 'TINYTEXT',
    TEXT = 'TEXT',
    MEDIUMTEXT = 'MEDIUMTEXT',
    LONGTEXT = 'LONGTEXT',
    TINYBLOB = 'TINYBLOB',
    BLOB = 'BLOB',
    MEDIUMBLOB = 'MEDIUMBLOB',
    LONGBLOB = 'LONGBLOB',
    DATE = 'DATE',
    TIME = 'TIME',
    DATETIME = 'DATETIME',
    TIMESTAMP = 'TIMESTAMP',
    YEAR = 'YEAR',
    JSON = 'JSON',
    GEOMETRY = 'GEOMETRY',
    POINT = 'POINT',
    LINESTRING = 'LINESTRING',
    POLYGON = 'POLYGON',
    MULTIPOINT = 'MULTIPOINT',
    MULTILINESTRING = 'MULTILINESTRING',
    MULTIPOLYGON = 'MULTIPOLYGON',
    GEOMETRYCOLLECTION = 'GEOMETRYCOLLECTION'
  }

  export enum MySQLEngine {
    INNODB = 'InnoDB',
    MYISAM = 'MyISAM',
    MEMORY = 'MEMORY',
    HEAP = 'HEAP',
    CSV = 'CSV',
    ARCHIVE = 'ARCHIVE',
    FEDERATED = 'FEDERATED',
    BLACKHOLE = 'BLACKHOLE',
    MRG_MYISAM = 'MRG_MyISAM'
  }

  export enum IndexType {
    BTREE = 'BTREE',
    HASH = 'HASH',
    RTREE = 'RTREE',
    FULLTEXT = 'FULLTEXT',
    SPATIAL = 'SPATIAL'
  }

  export enum ConstraintType {
    PRIMARY_KEY = 'PRIMARY KEY',
    UNIQUE = 'UNIQUE',
    FOREIGN_KEY = 'FOREIGN KEY',
    CHECK = 'CHECK',
    NOT_NULL = 'NOT NULL'
  }

  export enum ReferentialAction {
    RESTRICT = 'RESTRICT',
    CASCADE = 'CASCADE',
    SET_NULL = 'SET NULL',
    NO_ACTION = 'NO ACTION',
    SET_DEFAULT = 'SET DEFAULT'
  }

  export enum MaskingStrategy {
    ASTERISK = 'ASTERISK',
    HASH = 'HASH',
    PARTIAL = 'PARTIAL',
    RANDOM = 'RANDOM',
    CUSTOM = 'CUSTOM',
    REDACTED = 'REDACTED'
  }

  export enum ErrorType {
    DATABASE_ERROR = 'DATABASE_ERROR',
    SECURITY_ERROR = 'SECURITY_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    MCP_PROTOCOL_ERROR = 'MCP_PROTOCOL_ERROR',
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR'
  }

  export enum OperationType {
    TABLE_SCAN = 'TABLE_SCAN',
    INDEX_SCAN = 'INDEX_SCAN',
    INDEX_SEEK = 'INDEX_SEEK',
    RANGE_SCAN = 'RANGE_SCAN',
    NESTED_LOOP = 'NESTED_LOOP',
    HASH_JOIN = 'HASH_JOIN',
    MERGE_JOIN = 'MERGE_JOIN',
    SORT = 'SORT',
    GROUP_BY = 'GROUP_BY',
    AGGREGATE = 'AGGREGATE',
    DISTINCT = 'DISTINCT',
    UNION = 'UNION',
    TEMPORARY = 'TEMPORARY'
  }

  export enum OptimizationType {
    INDEX_SUGGESTION = 'INDEX_SUGGESTION',
    JOIN_OPTIMIZATION = 'JOIN_OPTIMIZATION',
    QUERY_REWRITE = 'QUERY_REWRITE',
    SCHEMA_OPTIMIZATION = 'SCHEMA_OPTIMIZATION',
    PARTITION_SUGGESTION = 'PARTITION_SUGGESTION'
  }

  export enum Priority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
  }

  export enum AnalysisType {
    DISTRIBUTION = 'distribution',
    NULLS = 'nulls',
    UNIQUE = 'unique',
    RANGE = 'range',
    PATTERN = 'pattern',
    CORRELATION = 'correlation'
  }

  // ============================================================================
  // 工具函数类型
  // ============================================================================

  export type DatabaseConnection = mysql.PoolConnection;
  export type QueryExecutionResult<T = Record<string, unknown>> = Promise<QueryResult<T>>;
  export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };
  export type AsyncHandler<T, R> = (input: T) => Promise<R>;
  export type EventHandler<T> = (event: T) => void | Promise<void>;

  // 条件类型和泛型约束
  export type TableOperation<T extends string> = T extends `SELECT ${string}` ? T : never;
  export type SecureQuery<T> = T extends SecurityContext ? T : never;
  export type ValidatedInput<T> = T & { readonly __validated: true };

  // 实用类型
  export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
  };

  export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
  export type NonNullable<T> = T extends null | undefined ? never : T;
  export type Prettify<T> = { [K in keyof T]: T[K] } & {};
}

// ============================================================================
// 运行时类型验证Schema
// ============================================================================

export const DatabaseConfigSchema = z.object({
  host: z.string().min(1, '数据库主机地址不能为空'),
  port: z.number().min(1, '端口号必须大于0').max(65535, '端口号不能超过65535'),
  database: z.string().min(1, '数据库名称不能为空'),
  username: z.string().min(1, '用户名不能为空'),
  password: z.string(),
  ssl: z.object({
    enabled: z.boolean(),
    rejectUnauthorized: z.boolean().optional(),
    ca: z.string().optional(),
    cert: z.string().optional(),
    key: z.string().optional()
  }).optional(),
  pool: z.object({
    connectionLimit: z.number().min(1, '连接池大小至少为1').max(100, '连接池大小不能超过100'),
    queueLimit: z.number().min(0, '队列限制不能为负数'),
    acquireTimeout: z.number().min(1000, '获取连接超时至少1秒'),
    timeout: z.number().min(1000, '查询超时至少1秒'),
    reconnect: z.boolean()
  }),
  charset: z.string().optional(),
  timezone: z.string().optional()
});

export const SecurityContextSchema = z.object({
  allowedTables: z.set(z.string()),
  deniedTables: z.set(z.string()),
  maxQueryTime: z.number().min(1000),
  maxResultRows: z.number().min(1).max(10000),
  enableDataMasking: z.boolean(),
  sensitiveColumns: z.array(z.string()),
  maskingRules: z.array(z.object({
    columnPattern: z.instanceof(RegExp),
    maskingStrategy: z.nativeEnum(MCPMySQL.MaskingStrategy),
    preserveLength: z.boolean(),
    customMaskChar: z.string().optional()
  }))
});

// ============================================================================
// 类型守卫函数
// ============================================================================

export function isDatabaseConfig(obj: unknown): obj is MCPMySQL.DatabaseConfig {
  return DatabaseConfigSchema.safeParse(obj).success;
}

export function isTableStructure(obj: unknown): obj is MCPMySQL.TableStructure {
  return typeof obj === 'object' && obj !== null && 'tableName' in obj && 'columns' in obj;
}

export function isMCPError(obj: unknown): obj is MCPMySQL.MCPError {
  return typeof obj === 'object' && obj !== null && 'code' in obj && 'message' in obj && 'type' in obj;
}

export function isQueryResult<T>(obj: unknown): obj is MCPMySQL.QueryResult<T> {
  return typeof obj === 'object' && obj !== null && 'rows' in obj && 'fields' in obj;
}

export function isSecurityContext(obj: unknown): obj is MCPMySQL.SecurityContext {
  return SecurityContextSchema.safeParse(obj).success;
}

// ============================================================================
// 类型断言函数
// ============================================================================

export function assertDatabaseConfig(obj: unknown): asserts obj is MCPMySQL.DatabaseConfig {
  if (!isDatabaseConfig(obj)) {
    throw new Error('无效的数据库配置');
  }
}

export function assertSecureQuery(query: string): asserts query is MCPMySQL.TableOperation<string> {
  if (!query.trim().toLowerCase().startsWith('select')) {
    throw new Error('只允许执行SELECT查询');
  }
}

export function assertNotNull<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('值不能为null或undefined');
  }
}