import { FileType } from '../../typings/utils';

/** 表格定义，新增记得检查对应的 create sql */
export interface Table {
  file: {
    id: number;
    name: string;
    path: string;
    parent_path: string;
    size: number;
    type: FileType;
  };

  dir: {
    id: number;
    name: string;
    path: string;
    parent_path: string;
    depth: number;
  };

  npm_pkg: {
    id: number;
    name: string;
    version: string;
    type: 'dependencies' | 'devDependencies';
  };

  dir_file_relation: {
    id: number;
    dir_id: number;
    file_id: number;
  };

  /** 文件引用关系表 */
  file_reference: {
    id: number;
    file_id: number;
    ref_id: number;
    remark: string;
    type: 'file' | 'npm' | 'unknown';
  };

  /** 文件属性表 */
  file_attr: {
    id: number;
    file_id: number;
    parent_key: string;
    key: string;
    value: string | null;
  };
}

export const createTables = [
  // 创建文件表
  `CREATE TABLE IF NOT EXISTS file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_path TEXT NOT NULL,
    type TEXT NOT NULL,
    /** 文件大小 单位b */
    size INTEGER DEFAULT 0);`,
  // 创建文件表索引
  `CREATE UNIQUE INDEX file_uniq_path on file (path);`,
  // 创建文件夹表
  `CREATE TABLE IF NOT EXISTS dir (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_path TEXT NOT NULL,
    depth INTEGER NOT NULL);`,
  // 创建文件夹表索引
  `CREATE UNIQUE INDEX dir_uniq_path on dir (path);`,
  // 新增表
  `CREATE TABLE IF NOT EXISTS dir_file_relation (
    /** 文件夹与文件关系表 自增id */
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    /** 文件夹id */
    dir_id INTEGER NOT NULL,
    /** 文件id */
    file_id INTEGER NOT NULL);`,
  // 新增表
  `CREATE TABLE IF NOT EXISTS file_reference (
    /** 文件之间引用关系表 自增id */
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    /** 文件id */
    file_id INTEGER NOT NULL,
    /** 引用关系id */
    ref_id INTEGER NOT NULL,
    /** 类型 1 引用 2被引用 */
    type INTEGER NOT NULL,
    remark TEXT ALLOW NULL
  );`,
  // 新增表
  `CREATE TABLE IF NOT EXISTS npm_pkg (
      /** 自增id */
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      type TEXT NOT NULL
    );`,
  // 新增表
  `CREATE TABLE IF NOT EXISTS file_attr (
    /** 自增id */
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    parent_key TEXT ALLOW NULL,
    key TEXT NOT NULL,
    value TEXT DEFAULT ''
  );`,
];
