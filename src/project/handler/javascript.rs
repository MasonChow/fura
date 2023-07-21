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

pub struct File {
  pub path: String,
  pub imports: HashMap<String, Vec<String>>,
}

impl File {
  pub fn auto_complete_import_path(
    &self,
    base_path: &String,
    alias: &Option<HashMap<String, String>>,
  ) {
  }
}

pub struct ProjectJavascriptFile {
  pub base_path: String,
  pub alias: Option<HashMap<String, String>>,
  pub files: HashMap<String, File>,
}

impl ProjectJavascriptFile {
  pub fn new(base_path: String, alias: Option<HashMap<String, String>>) -> Self {
    let mut files: HashMap<String, File> = HashMap::new();

    let js_file_map = query_js_files().unwrap();

    for file_item in js_file_map {
      let (path, _) = &file_item;
      let result = parser::javascript::File::new(&path);

      files.insert(
        path.to_string(),
        File {
          path: path.to_string(),
          imports: result.code_parser.imports,
        },
      );
    }

    ProjectJavascriptFile {
      base_path,
      alias,
      files,
    }
  }
  // 自动补全处理 js 的 import 语句，自动匹配存在的路径
  // './a/b' -> './b/index.(js|jsx|ts|tsx|cjs|mjs)'
  // './a' -> './a.(js|jsx|ts|tsx|cjs|mjs)'
  // 'antd' -> package.json -> dependencies -> antd
  // 'antd/lib/button' -> package.json -> dependencies -> antd
  pub fn auto_complete_import_path(&self) {
    let files = &self.files;

    for (key, value) in files {}
  }
}

// pub fn auto_complete_import_path(project_file: &ProjectJavascriptFile) -> ProjectJavascriptFile {
// let mut result: String = import_path.to_string();

// // 1. 判断是否是直接是文件后缀 .js .jsx .ts .tsx .cjs .mjs
// for ext in EXTENSIONS.iter() {
//   if result.ends_with(ext) {
//     return result;
//   }
// }

// match alias {
//   Some(alias) => {
//     for (key, value) in alias {
//       if result.starts_with(&key) {
//         result = result.replace(&key, &value);
//       }
//     }
//   }
//   None => {}
// }

// return result;

// 2. 判断是否是相对路径
// }

/// 分析项目内所有 js 文件
pub fn analyze_all(base_path: String, alias: Option<HashMap<String, String>>) {
  let js_file_map = query_js_files().unwrap();
  for (path, _) in js_file_map {
    let result = parser::javascript::File::new(&path);

    result.code_parser.imports.iter().for_each(|item| {
      println!("{} => {:?}", path, item);
    });
  }
}
