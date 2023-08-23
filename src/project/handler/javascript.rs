use crate::database::sqlite;
use crate::parser;
use std::collections::HashMap;
use std::path::PathBuf;
use url::Url;

const EXTENSIONS: [&str; 6] = ["js", "jsx", "ts", "tsx", "cjs", "mjs"];

#[derive(Debug)]
pub struct FileImports {
  pub file: HashMap<String, Vec<String>>,
  pub npm_pkg: HashMap<String, Vec<String>>,
}

#[derive(Debug)]
pub struct File {
  pub id: u64,
  pub path: String,
  // pub source_imports: HashMap<String, Vec<String>>,
  // pub import_file_map: Option<HashMap<String, Vec<String>>>,
  // pub import_npm_map: Option<HashMap<String, Vec<String>>>,
  pub imports: FileImports,
}

#[derive(Debug)]
pub struct ProjectJavascriptDataInfo {
  pub files: HashMap<String, File>,
  pub npm_pkgs: HashMap<String, u64>,
}

impl ProjectJavascriptDataInfo {
  pub fn new(alias: &Option<HashMap<String, String>>) -> Self {
    let js_file_map = query_js_files().unwrap();
    let npm_pkgs = query_npm_pkgs().unwrap();

    let mut files: HashMap<String, File> = HashMap::new();

    for file_item in &js_file_map {
      let (path, id) = file_item;
      let result = parser::javascript::File::new(&path);

      files.insert(
        path.to_string(),
        File {
          id: *id,
          path: path.to_string(),
          imports: auto_compete_import_path(
            path.to_string(),
            &result.code_parser.imports,
            &js_file_map,
            &npm_pkgs,
            &alias,
          ),
        },
      );
    }

    ProjectJavascriptDataInfo { files, npm_pkgs }
  }
}

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

/// 查询项目内所有 js 文件
fn query_npm_pkgs() -> Result<HashMap<String, u64>, String> {
  let mut npm_pkg_map: HashMap<String, u64> = HashMap::new();

  let conn = sqlite::get_db().expect("获取 DB 失败");

  let mut stmt: sqlite::Statement = conn
    .prepare(
      r#"
      SELECT
        id,
        name
      FROM
        "npm_pkg";
      "#,
    )
    .expect("查询失败");

  let result = stmt.query_map([], |row| Ok((row.get(0).unwrap(), row.get(1).unwrap())));

  for item in result.unwrap() {
    let (id, name) = item.unwrap();
    npm_pkg_map.insert(name, id);
  }

  Ok(npm_pkg_map)
}

/*
自动补全处理 js 的 import 语句，自动匹配存在的路径

1. './a/b' -> './b/index.(js|jsx|ts|tsx|cjs|mjs)'
2. './a' -> './a.(js|jsx|ts|tsx|cjs|mjs)'
3. 'antd' -> package.json -> dependencies -> antd
4. 'antd/lib/button' -> package.json -> dependencies -> antd
*/
fn auto_compete_import_path(
  file_path: String,
  imports: &HashMap<String, Vec<String>>,
  project_files: &HashMap<String, u64>,
  project_npm_pkgs: &HashMap<String, u64>,
  alias: &Option<HashMap<String, String>>,
) -> FileImports {
  let mut result = FileImports {
    file: HashMap::new(),
    npm_pkg: HashMap::new(),
  };

  // 遍历 imports 处理依赖路径
  for (import_path, import_modules) in imports {
    let mut deps_path: String = import_path.to_string();

    // 有传入 alias，则进行匹配替换
    match alias {
      Some(alias) => {
        for (key, value) in alias {
          if deps_path.starts_with(key) {
            deps_path = deps_path.replace(key, value);
          }
        }
      }
      None => {}
    }

    if let Some(deps_real_path) = resolve_import_file_path(&deps_path, &file_path, &project_files) {
      println!("match file {:?} {:?}", &import_path, &deps_real_path);
      result
        .file
        .insert(deps_real_path.to_string(), import_modules.clone());
      continue;
    }

    println!(
      "un match -> check npm pkg {:?} {:?}",
      &file_path, &deps_path
    );

    // match resolve_import_file_path(&deps_path, &file_path, &project_files) {
    //   Some(deps_real_path) => {
    //     println!("match file {:?}", &deps_real_path);
    //     result
    //       .file
    //       .insert(deps_real_path.to_string(), import_modules.clone());
    //     continue;
    //   }

    //   None => {
    //     println!(
    //       "un match -> check npm pkg {:?} {:?}",
    //       &file_path, &deps_path
    //     );

    //     for pkg in project_npm_pkgs.keys() {
    //       if deps_path.starts_with(pkg) {
    //         // file_real_path = PathBuf::from(pkg);
    //         // break;
    //         println!("match npm pkg {:?}", pkg);
    //       }
    //     }
    //   }
    // }
  }

  result
}

fn resolve_import_file_path(
  import_path: &str,
  file_path: &str,
  project_files: &HashMap<String, u64>,
) -> Option<String> {
  // 先转成 URL 的形态进行路径拼接处理
  let mut url = String::from("file://");
  url.push_str(file_path);
  let mut deps_real_url = Url::parse(&url).expect("解析失败");

  // 如果是相对路径则进行拼接
  if import_path.starts_with("./") || import_path.starts_with("../") {
    deps_real_url = deps_real_url.join(import_path).unwrap();
  }

  let is_real_file = |match_path: &str| -> bool {
    return project_files.contains_key(match_path);
  };

  let mut deps_real_path: PathBuf = deps_real_url.to_file_path().unwrap();

  // 如果是真实文件则返回
  if is_real_file(&deps_real_path.to_str().unwrap()) {
    return Some(deps_real_path.to_str().unwrap().to_string());
  }

  // 尝试补充后缀名进行匹配
  for ext in EXTENSIONS {
    if !deps_real_path.extension().is_some() {
      deps_real_path.set_extension(ext);
    }

    // 如果是真实文件则返回
    if is_real_file(&deps_real_path.to_str().unwrap()) {
      return Some(deps_real_path.to_str().unwrap().to_string());
    }

    // 设置 index 文件的文件名
    deps_real_path.set_file_name("index");
    // 设置 index 文件的扩展名
    deps_real_path.set_extension(ext);

    // 如果是真实文件则返回
    if is_real_file(&deps_real_path.to_str().unwrap()) {
      return Some(deps_real_path.to_str().unwrap().to_string());
    }
  }

  None
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_auto_compete_import_path() {
    let file_path = String::from("/path/to/file.js");
    let mut imports: HashMap<String, Vec<String>> = HashMap::new();
    imports.insert(String::from("./a"), vec![String::from("a")]);
    imports.insert(String::from("antd"), vec![String::from("Button")]);

    let mut project_files: HashMap<String, u64> = HashMap::new();
    project_files.insert(String::from("/path/to/a.js"), 1);
    project_files.insert(String::from("/path/to/b.js"), 2);

    let mut project_npm_pkgs: HashMap<String, u64> = HashMap::new();
    project_npm_pkgs.insert(String::from("antd"), 1);

    let alias: Option<HashMap<String, String>> = None;

    let result = auto_compete_import_path(
      file_path,
      &imports,
      &project_files,
      &project_npm_pkgs,
      &alias,
    );

    let mut expected_file_imports: HashMap<String, Vec<String>> = HashMap::new();
    expected_file_imports.insert(String::from("/path/to/a.js"), vec![String::from("a")]);

    let mut expected_npm_pkg_imports: HashMap<String, Vec<String>> = HashMap::new();
    expected_npm_pkg_imports.insert(String::from("antd"), vec![String::from("Button")]);

    assert_eq!(result.file, expected_file_imports);
    assert_eq!(result.npm_pkg, expected_npm_pkg_imports);
  }
}
