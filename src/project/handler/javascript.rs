use crate::database::sqlite;
use crate::parser;
use std::collections::HashMap;

const EXTENSIONS: [&str; 6] = ["js", "jsx", "ts", "tsx", "cjs", "mjs"];

/// 查询项目内所有 js 文件
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

// 自动补全处理 js 的 import 语句，自动匹配存在的路径
// './a/b' -> './b/index.(js|jsx|ts|tsx|cjs|mjs)'
// './a' -> './a.(js|jsx|ts|tsx|cjs|mjs)'
// 'antd' -> package.json -> dependencies -> antd
// 'antd/lib/button' -> package.json -> dependencies -> antd
pub fn auto_complete_import_path(
  import_path: &str,
  project_files: Vec<String>,
  npm_packages: Option<HashMap<String, String>>,
  alias: Option<HashMap<String, String>>,
) -> String {
  // 1. 判断是否是直接是文件后缀 .js .jsx .ts .tsx .cjs .mjs
  for ext in EXTENSIONS.iter() {
    if import_path.ends_with(ext) {
      return import_path.to_string();
    }
  }

  // 2. 判断是否是相对路径

  return import_path.to_string();
}

/// 分析项目内所有 js 文件
pub fn analyze_all(alias: Option<HashMap<String, String>>) {
  let js_file_map = query_js_files().unwrap();
  for (path, _) in js_file_map {
    let result = parser::javascript::File::new(&path);

    result.code_parser.imports.iter().for_each(|item| {
      println!("{} => {:?}", path, item);
    });
  }
}
