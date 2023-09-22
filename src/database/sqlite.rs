pub use rusqlite::{Connection, Result, Statement};
use std::fs::remove_file;
use tracing::{debug, error};

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

pub struct FileRefs<'a> {
  pub file_id: u64,
  pub ref_id: u64,
  pub ref_type: &'a str,
  pub module: &'a str,
}

pub fn init() -> Result<()> {
  let init_table_sql = include_str!("./sql/init_table.sql");

  #[cfg(debug_assertions)]
  {
    let cache_path = "./.fura/data.db";
    remove_file(&cache_path).unwrap_or_default();
  }

  let conn = get_db()?;
  conn.execute_batch(init_table_sql)?;
  debug!("initialized database");
  Ok(())
}

pub fn get_db() -> Result<Connection> {
  let cache_path = "./.fura/data.db";
  let conn = Connection::open(&cache_path)?;
  debug!("opened database connection");
  Ok(conn)
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
    Ok(_) => debug!("inserted file: {}", &file.path),
    Err(err) => error!("failed to insert file: {}", err),
  };
}

pub async fn insert_dir(dir: Dir) {
  let conn = get_db().unwrap();

  let result = conn.execute(
    "INSERT INTO dir (name, path, parent_path) VALUES (?1, ?2, ?3)",
    (&dir.name, &dir.path, &dir.parent_path),
  );

  match result {
    Ok(_) => debug!("inserted dir: {}", &dir.path),
    Err(err) => error!("failed to insert dir: {}", err),
  };
}

pub async fn insert_npm_pkg(npm_pkg: NpmPkg) {
  let conn = get_db().unwrap();

  let result = conn.execute(
    "INSERT INTO npm_pkg (name, version, type) VALUES (?1, ?2, ?3)",
    (&npm_pkg.name, &npm_pkg.version, &npm_pkg.pkg_type),
  );

  match result {
    Ok(_) => debug!("inserted npm package: {}", &npm_pkg.name),
    Err(err) => error!("failed to insert npm package: {}", err),
  };
}

pub async fn insert_file_reference(file_refs: FileRefs<'_>) {
  let conn = get_db().unwrap();

  let result = conn.execute(
    "INSERT INTO file_reference (file_id, ref_id, ref_type, module) VALUES (?1, ?2, ?3, ?4)",
    (
      &file_refs.file_id,
      &file_refs.ref_id,
      &file_refs.ref_type,
      &file_refs.module,
    ),
  );

  match result {
    Ok(_) => debug!("inserted file reference"),
    Err(err) => error!("failed to insert file reference: {}", err),
  };
}
