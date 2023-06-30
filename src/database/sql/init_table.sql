/** 创建文件表 */
CREATE TABLE IF NOT EXISTS file (
  /** 文件表id，自增 */
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  /** 文件名 */
  name TEXT NOT NULL,
  /** 文件路径 */
  path TEXT NOT NULL,
  /** 文件父级目录路径 */
  parent_path TEXT NOT NULL,
  /** 文件类型 */
  ext TEXT NOT NULL,
  /** 文件大小，单位为字节 */
  size INTEGER DEFAULT 0
);

/** 创建文件夹表 */
CREATE TABLE IF NOT EXISTS dir (
  /** 文件夹表id，自增 */
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  /** 文件夹名 */
  name TEXT NOT NULL,
  /** 文件夹路径 */
  path TEXT NOT NULL,
  /** 文件夹父级目录路径 */
  parent_path TEXT NOT NULL
);

/** 创建文件夹表 */
CREATE TABLE IF NOT EXISTS dir_file_relation (
  /** 文件夹与文件关系表id，自增 */
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  /** 文件夹id */
  dir_id INTEGER NOT NULL,
  /** 文件id */
  file_id INTEGER NOT NULL
);

/** 创建文件夹与文件关系表 */
CREATE TABLE IF NOT EXISTS file_reference (
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
);

/** 创建npm包表 */
CREATE TABLE IF NOT EXISTS npm_pkg (
  /** npm包表id，自增 */
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  /** npm包名 */
  name TEXT NOT NULL,
  /** npm包版本 */
  version TEXT NOT NULL,
  /** npm包类型 */
  type TEXT NOT NULL
);

/** 创建文件属性表 */
CREATE TABLE IF NOT EXISTS file_attr (
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
);