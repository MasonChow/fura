use crate::database::sqlite;
use crate::project::ast_parser;
use crate::project::reader;
use std::collections::HashMap;

fn query_js_files() -> Result<HashMap<String, u64>, String> {
  let mut js_file_map: HashMap<String, u64> = HashMap::new();

  let conn = sqlite::get_db().expect("获取 DB 失败");

  let mut stmt: sqlite::Statement = conn
    .prepare(
      r#"
      SELECT
        id,
        path
      FROM
        "file"
      WHERE
        ext in("js", "jsx", "ts", "tsx", "cjs", "mjs");
      "#,
    )
    .expect("查询失败");

  let result = stmt.query_map([], |row| Ok((row.get(0).unwrap(), row.get(1).unwrap())));

  for item in result.unwrap() {
    let (id, path) = item.unwrap();
    js_file_map.insert(path, id);
  }

  Ok(js_file_map)
}

fn analyze_deps(path: &str) -> Result<(), String> {
  let content = reader::read_file(path).unwrap();
  let _ast = ast_parser::javascript::parse(&content).unwrap();

  return Ok(());
}

pub fn run() {
  let js_file_map = query_js_files().unwrap();
  // let paths: Vec<String> = vec![];
  // print!("{:#?}", js_file_map);
  for (path, _) in js_file_map {
    // paths.push(path);
    analyze_deps(&path).unwrap();
    break;
  }
}
