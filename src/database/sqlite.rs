/// 此代码定义了一个名为“sqlite”的模块，该模块提供了一个函数“execute_batch”，该函数将 SQL
/// 查询作为字符串并使用“rusqlite”库执行它。该函数首先使用“debug_assertions”标志检查代码是否正在调试模式下编译。如果是，它将打开位于“./debug”目录中名为“.fura.db”的
/// SQLite 数据库文件。如果没有，它将打开一个内存数据库。然后该函数在数据库连接上执行 SQL 查询并返回结果。
pub use rusqlite::{Connection, Error, OpenFlags, Result, Statement};
use std::fs::remove_file;

pub struct Dir {
  pub name: String,
  pub path: String,
  pub parent_path: String,
}

pub struct File {
  pub name: String,
  pub path: String,
  pub parent_path: String,
  pub size: u64,
  pub ext: String,
}

pub struct NpmPkg {
  pub name: String,
  pub version: String,
  pub pkg_type: String,
}

pub fn init() -> Result<()> {
  let init_table_sql = include_str!("./sql/init_table.sql");

  #[cfg(debug_assertions)]
  {
    let cache_path = "./.fura/data.db";
    remove_file(&cache_path).unwrap_or_default();
  }

  return get_db()?.execute_batch(init_table_sql);
}

pub fn get_db() -> Result<Connection> {
  let cache_path = "./.fura/data.db";
  let conn = Connection::open(&cache_path)?;
  return Ok(conn);
}

pub async fn insert_file(file: File) {
  let conn = get_db().unwrap();

  let result = conn.execute(
    "INSERT INTO file (name, path, parent_path, size, ext) VALUES (?1, ?2, ?3, ?4, ?5)",
    (
      &file.name,
      &file.path,
      &file.parent_path,
      &file.size,
      &file.ext,
    ),
  );

  match result {
    Ok(_) => println!("insert file success: {}", &file.path),
    Err(err) => panic!("insert file failed: {}", err),
  };
}

pub async fn insert_dir(dir: Dir) {
  let conn = get_db().unwrap();

  let result = conn.execute(
    "INSERT INTO dir (name, path, parent_path) VALUES (?1, ?2, ?3)",
    (&dir.name, &dir.path, &dir.parent_path),
  );

  match result {
    Ok(_) => println!("insert dir success: {}", &dir.path),
    Err(err) => panic!("insert dir failed: {}", err),
  };
}

pub async fn insert_npm_pkg(npm_pkg: NpmPkg) {
  let conn = get_db().unwrap();

  let result = conn.execute(
    "INSERT INTO npm_pkg (name, version, type) VALUES (?1, ?2, ?3)",
    (&npm_pkg.name, &npm_pkg.version, &npm_pkg.pkg_type),
  );

  match result {
    Ok(_) => println!("insert npm_pkg success: {}", &npm_pkg.name),
    Err(err) => panic!("insert npm_pkg failed: {}", err),
  };
}

struct TableFile {
  id: i32,
  name: String,
  path: String,
  size: u32,
}

pub async fn query_all_js_files() -> Option<Vec<TableFile>> {
  let conn = get_db().unwrap();
  let mut result: Vec<TableFile> = vec![];

  let mut stmt = conn
    .prepare(
      r#"
      SELECT
        id,
        name,
        path,
        size
      FROM
        "file"
      WHERE
        ext in("js", "jsx", "ts", "tsx", "cjs", "mjs");
    "#,
    )
    .unwrap();

  let rows = stmt
    .query_map([], |row| {
      Ok(TableFile {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        size: row.get(3)?,
      })
    })
    .unwrap();

  for row in rows {
    if let Ok(row) = row {
      result.push(row);
    };
  }

  return Some(result);
}
