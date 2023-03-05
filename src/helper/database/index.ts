/**
 * @name 基础sqlLite操作方法
 */

import SQLITE from 'better-sqlite3';
import knex, { Knex } from 'knex';
import fs from 'fs';
import logger from '../logger';

import { createTables, Table } from './table';

/**
 * 表示数据库表的类型。
 */
export type DatabaseTable = Table;

/**
 * 数据库查询构建器类型。
 * @typeparam TableName - 数据库表名称。
 */
export type DatabaseQueryBuilder<TableName extends keyof DatabaseTable> =
  Knex.Where<DatabaseTable[TableName]>;

/**
 * 数据库实例，底层DB使用sqlite3，使用knex+better-sqlite3进行交互
 * @constructor filePath: db文件的路径，不存在即创建，默认':memory'，数据存于内存
 */
export class Database {
  private knex: Knex;

  /**
   * 构造函数，用于创建数据库链接、检查并创建表
   * @param filePath 数据库文件路径，支持内存数据库，例如 ":memory:"
   * @param forceCreate 是否强制创建新数据库
   */
  constructor(filePath = ':memory', forceCreate = true) {
    // 记录初始化信息
    logger.info('初始化数据库链接，数据库文件缓存地址:', filePath);

    // 如果指定了强制创建并且数据库文件不是内存数据库，则先删除已存在的数据库文件
    if (forceCreate && filePath !== ':memory') {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.info(`${filePath} 文件不存在，无需清空`);
      }
    }

    // 实例化数据库，不存在即创建
    const db = new SQLITE(filePath, { verbose: logger.info });

    // 开启WAL模式优化读写性能 https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
    // db.pragma('journal_mode = WAL');

    // 调用创建表语句创建表
    logger.info('检查并创建数据库表');
    createTables.forEach((sql) => {
      db.exec(sql);
    });

    // 连接到数据库
    logger.info('检查并创建数据库');
    this.knex = knex({
      client: 'better-sqlite3',
      connection: {
        filename: filePath,
      },
      // useNullAsDefault 表示在插入数据时如果字段值为 null，自动转为默认值
      // 这个设置是为了避免出现一些奇怪的数据类型转换问题
      useNullAsDefault: true,
    });

    // 记录初始化完成信息
    logger.info('链接数据库完成');
  }

  /**
   * 执行普通查询
   * @param tableName - 查询的表名
   * @param select - 需要查询的表字段，默认为 ['*']，表示查询所有字段
   * @param where - 查询条件，格式为 Record<表字段, 内容>
   * @returns 返回查询结果的数组，内容基于 select 字段。如果 select 中包含 '*'，则返回的是 Table[T] 类型数组；否则返回的是 Pick<Table[T], S> 类型数组
   */
  public query<
    T extends keyof Table, // 表名类型
    S extends keyof Table[T], // select 字段的类型
    W extends Partial<Table[T]>, // where 参数的类型,
  >(tableName: T, select: (S | '*')[] = ['*'], where: W = Object.create(null)) {
    let query = this.knex(tableName);

    if (where) {
      query = query.where(where);
    }

    if (select) {
      query = query.select(select);
    }

    // 如果 select 中包含 '*'，则返回 Table[T] 类型数组；否则返回 Pick<Table[T], S> 类型数组
    if (select?.includes('*')) {
      return query as Knex.QueryBuilder<Table[T], Array<Table[T]>>;
    }

    return query as Knex.QueryBuilder<Table[T], Array<Pick<Table[T], S>>>;
  }

  /**
   * 单条数据插入
   * @param tableName: 表名
   * @param insertData: 插入内容 Record<表字段, 内容>
   * @returns 数据id number
   */
  public insert<T extends keyof Table, W extends Partial<Table[T]>>(
    tableName: T,
    insertData: W,
  ) {
    return this.knex(tableName).insert(insertData).returning('id');
  }

  /**
   * 批量数据插入
   * @param tableName: 表名
   * @param insertData: 插入内容 Array<Record<表字段, 内容>>
   */
  public async inserts<T extends keyof Table, W extends Partial<Table[T]>>(
    tableName: T,
    insertData: W[],
  ) {
    // 由于sqlite批量插入200+会报错，暂时用单条插入的情况处理
    const result = await Promise.all(
      insertData.map((data) => {
        return this.insert(tableName, data);
      }),
    );

    return result;
    // return this.knex(tableName).insert(insertData);
  }

  /**
   * 更新数据
   * @param tableName: 表名
   * @param where: 查询条件 Record<表字段, 内容>
   * @param updateData: 更新内容 Record<表字段, 内容>
   */
  public update<
    T extends keyof Table,
    W extends Partial<Table[T]>,
    U extends Partial<Table[T]>,
  >(tableName: T, where: W, update: U) {
    return this.knex(tableName).where(where).update(update);
  }

  /**
   * 基于id批量删除数据
   * @param tableName: 表名
   * @param ids: Array<数据id>
   */
  public deleteByIds<T extends keyof Table>(tableName: T, ids: number[]) {
    return this.knex(tableName).where('id', 'in', ids).delete();
  }

  /**
   * 基于查询条件批量删除数据
   * @param tableName: 表名
   * @param where: 查询条件 Record<表字段, 内容>
   */
  public delete<T extends keyof Table, W extends Partial<Table[T]>>(
    tableName: T,
    where: W = Object.create(null),
  ) {
    return this.knex(tableName).where(where).delete();
  }

  public useSql<T extends Object>(sql: string) {
    return this.knex.raw<T[]>(sql);
  }

  /**
   * 获取knex实例，一般用于做复杂的sql查询
   * @readonly
   */
  get client() {
    return this.knex;
  }

  /**
   * 获取某个表的knex实例，一般用于做复杂的sql查询
   * @param tableName: 表名
   * @readonly
   */
  public table<T extends keyof Table>(tableName: T) {
    return this.knex<Table[T]>(tableName);
  }
}

export default Database;
