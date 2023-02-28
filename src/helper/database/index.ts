import SQLITE from 'better-sqlite3';
import knex, { Knex } from 'knex';
import fs from 'fs';
import logger from '../logger';

import { createTables, Table } from './table';

export type DatabaseTable = Table;

export type DatabaseQueryBuilder<TableName extends keyof DatabaseTable> =
  Knex.Where<DatabaseTable[TableName]>;

/**
 * @description 数据库实例，底层DB使用sqlite3，使用knex+better-sqlite3进行交互
 * @constructor filePath: db文件的路径，不存在即创建，默认':memory'，数据存于内存
 */
export class Database {
  private knex: Knex;

  constructor(filePath = ':memory', forceCreate = true) {
    logger.info('初始化数据库链接，数据库文件缓存地址:', filePath);
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
    logger.info('检查并创建数据库表');
    // 调用创建表语句创建表
    createTables.forEach((sql) => {
      db.exec(sql);
    });
    logger.info('检查并创建数据库');
    this.knex = knex({
      client: 'better-sqlite3',
      connection: {
        filename: filePath,
      },
      useNullAsDefault: true,
    });
    logger.info('链接数据库完成');
  }

  /**
   * @description 普通查询
   * @param tableName: 表名
   * @param select: Array<表字段> | ['*']
   * @param where: 查询条件 Record<表字段, 内容>
   * @returns 返回内容基于Select字段 Array<select>
   */
  public query<
    T extends keyof Table,
    S extends keyof Table[T],
    W extends Partial<Table[T]>,
  >(tableName: T, select?: (S | '*')[], where: W = Object.create(null)) {
    let query = this.knex(tableName);

    if (where) {
      query = query.where(where);
    }

    if (select) {
      query = query.select(select);
    }

    if (select?.includes('*')) {
      return query as Knex.QueryBuilder<Table[T], Array<Table[T]>>;
    }

    return query as Knex.QueryBuilder<Table[T], Array<Pick<Table[T], S>>>;
  }

  /**
   * @description 单条数据插入
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
   * @description 批量数据插入
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
   * @description 更新数据
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
   * @description 基于id批量删除数据
   * @param tableName: 表名
   * @param ids: Array<数据id>
   */
  public deleteByIds<T extends keyof Table>(tableName: T, ids: number[]) {
    return this.knex(tableName).where('id', 'in', ids).delete();
  }

  /**
   * @description 基于查询条件批量删除数据
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
   * @description 获取knex实例，一般用于做复杂的sql查询
   * @readonly
   */
  get client() {
    return this.knex;
  }

  /**
   * @description 获取某个表的knex实例，一般用于做复杂的sql查询
   * @param tableName: 表名
   * @readonly
   */
  public table<T extends keyof Table>(tableName: T) {
    return this.knex<Table[T]>(tableName);
  }
}

export default Database;
