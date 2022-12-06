export const createTables = [
  // 创建文件表
  `CREATE TABLE IF NOT EXISTS file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    size REAL DEFAULT 0);`,
  // 创建文件表索引
  `CREATE UNIQUE INDEX file_uniq_path on file (path);`,
  // 创建文件夹表
  `CREATE TABLE IF NOT EXISTS dir (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    depth INTEGER NOT NULL);`,
  // 创建文件夹表索引
  `CREATE UNIQUE INDEX dir_uniq_path on dir (path);`,
  // 文件夹与文件关系
  `CREATE TABLE IF NOT EXISTS dir_file_relation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dir_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL);`,
];
