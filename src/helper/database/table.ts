/**
 * @name 建表语句与类型导出
 *
 * 新增表定义记得检查对应的 create sql
 */

import { FileType } from '../../typings/utils';

/**
 * 定义表格数据结构
 *
 * 有新增类型记得检查对应的create sql
 */
export interface Table {
  /**
   * 文件信息表
   */
  file: {
    /**
     * 文件 ID
     */
    id: number;
    /**
     * 文件名称
     */
    name: string;
    /**
     * 文件路径
     */
    path: string;
    /**
     * 父路径
     */
    parent_path: string;
    /**
     * 文件大小
     */
    size: number;
    /**
     * 文件类型
     */
    type: FileType;
  };

  /**
   * 目录信息表
   */
  dir: {
    /**
     * 目录 ID
     */
    id: number;
    /**
     * 目录名称
     */
    name: string;
    /**
     * 目录路径
     */
    path: string;
    /**
     * 父路径
     */
    parent_path: string;
    /**
     * 深度
     */
    depth: number;
  };

  /**
   * npm 包信息表
   */
  npm_pkg: {
    /**
     * npm 包 ID
     */
    id: number;
    /**
     * 包名称
     */
    name: string;
    /**
     * 包版本
     */
    version: string;
    /**
     * 包类型（dependencies 或 devDependencies）
     */
    type: 'dependencies' | 'devDependencies';
  };

  /**
   * 目录文件关联表
   */
  dir_file_relation: {
    /**
     * 关联 ID
     */
    id: number;
    /**
     * 目录 ID
     */
    dir_id: number;
    /**
     * 文件 ID
     */
    file_id: number;
  };

  /**
   * 文件引用关系表
   */
  file_reference: {
    /**
     * 引用关系 ID
     */
    id: number;
    /**
     * 文件 ID
     */
    file_id: number;
    /**
     * 引用 ID
     */
    ref_id: number;
    /**
     * 备注
     */
    remark: string;
    /**
     * 引用类型（file, npm 或 unknown）
     */
    type: 'file' | 'npm' | 'unknown';
  };

  /**
   * 文件属性表
   */
  file_attr: {
    /**
     * 属性 ID
     */
    id: number;
    /**
     * 文件 ID
     */
    file_id: number;
    /**
     * 文件属性类型（page, module, component 或 unknown）
     */
    type: 'page' | 'module' | 'component' | 'unknown';
    /**
     * 文件属性名称
     */
    name: string;
    /**
     * 文件属性描述
     */
    description: string;
    /**
     * 额外信息
     */
    extra: string;
  };
}

/**
 * 创建表字段
 */
export const createTables = [
  // 创建文件表
  `CREATE TABLE IF NOT EXISTS file (
   /** 文件表id，自增 */
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   /** 文件名 */
   name TEXT NOT NULL,
   /** 文件路径 */
   path TEXT NOT NULL,
   /** 文件父级目录路径 */
   parent_path TEXT NOT NULL,
   /** 文件类型 */
   type TEXT NOT NULL,
   /** 文件大小，单位为字节 */
   size INTEGER DEFAULT 0);`,
  // 创建文件表索引
  `CREATE UNIQUE INDEX file_uniq_path on file (path);`,
  // 创建文件夹表
  `CREATE TABLE IF NOT EXISTS dir (
   /** 文件夹表id，自增 */
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   /** 文件夹名 */
   name TEXT NOT NULL,
   /** 文件夹路径 */
   path TEXT NOT NULL,
   /** 文件夹父级目录路径 */
   parent_path TEXT NOT NULL,
   /** 文件夹深度 */
   depth INTEGER NOT NULL);`,
  // 创建文件夹表索引
  `CREATE UNIQUE INDEX dir_uniq_path on dir (path);`,
  // 创建文件夹与文件关系表
  `CREATE TABLE IF NOT EXISTS dir_file_relation (
   /** 文件夹与文件关系表id，自增 */
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   /** 文件夹id */
   dir_id INTEGER NOT NULL,
   /** 文件id */
   file_id INTEGER NOT NULL);`,
  // 创建文件之间引用关系表
  `CREATE TABLE IF NOT EXISTS file_reference (
   /** 文件之间引用关系表id，自增 */
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   /** 文件id */
   file_id INTEGER NOT NULL,
   /** 引用关系id */
   ref_id INTEGER NOT NULL,
   /** 引用类型，1表示引用，2表示被引用 */
   type INTEGER NOT NULL,
   /** 备注 */
   remark TEXT ALLOW NULL
 );`,
  // 创建npm包表
  `CREATE TABLE IF NOT EXISTS npm_pkg (
   /** npm包表id，自增 */
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   /** npm包名 */
   name TEXT NOT NULL,
   /** npm包版本 */
   version TEXT NOT NULL,
   /** npm包类型 */
   type TEXT NOT NULL
 );`,
  // 创建文件属性表
  `CREATE TABLE IF NOT EXISTS file_attr (
   /** 文件属性表id，自增 */
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   /** 文件id */
   file_id INTEGER NOT NULL,
   /** 属性类型 */
   type TEXT NOT NULL,
   /** 属性名 */
   name TEXT DEFAULT '',
   /** 属性描述 */
   description TEXT DEFAULT '',
   /** 额外信息 */
   extra TEXT DEFAULT ''
 );`,
];
