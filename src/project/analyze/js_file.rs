use crate::database::sqlite;
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

  let _ = stmt.query_map([], |row| {
    let id: u64 = row.get(0).unwrap();
    let path: String = row.get(1).unwrap();

    js_file_map.insert(path, id);

    Ok(())
  });

  return Ok(js_file_map);
}

pub fn analysis() -> Result<(), String> {
  let js_file_map = query_js_files()?;
  let keys = &js_file_map.keys();

  println!("{:?}", js_file_map);

  Ok(())
}
