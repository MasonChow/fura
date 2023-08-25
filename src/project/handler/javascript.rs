use crate::database::sqlite;
use crate::parser;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use url::Url;

const EXTENSIONS: [&str; 6] = ["js", "jsx", "ts", "tsx", "cjs", "mjs"];

#[derive(Debug)]
pub struct FileImports {
  pub module: HashMap<String, Vec<String>>,
  pub npm_pkg: HashMap<String, Vec<String>>,
  pub file: HashMap<String, Vec<String>>,
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
  pub fn new(alias: &Option<HashMap<&str, &str>>) -> Self {
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
  alias: &Option<HashMap<&str, &str>>,
) -> FileImports {
  let mut result = FileImports {
    module: HashMap::new(),
    npm_pkg: HashMap::new(),
    file: HashMap::new(),
  };

  // 遍历 imports 处理依赖路径
  for (import_path, import_modules) in imports {
    let mut deps_path: String = import_path.to_string();

    // 有传入 alias，则进行匹配替换
    match alias {
      Some(alias) => {
        for (key, value) in alias {
          if let Some(start_path) = deps_path.split('/').next() {
            if &start_path == key {
              deps_path = deps_path.replacen(key, value, 1);
            }
          }
        }
      }
      None => {}
    }

    if let Some(deps_real_path) = resolve_import_file_path(
      &deps_path,
      &file_path,
      &project_files.keys().map(|s| s.as_str()).collect(),
    ) {
      result
        .module
        .insert(deps_real_path.to_string(), import_modules.clone());
      continue;
    }

    // 如果是 npm 包，则进行匹配
    if project_npm_pkgs.contains_key(&deps_path) {
      result
        .npm_pkg
        .insert(deps_path.to_string(), import_modules.clone());
      continue;
    }

    result
      .file
      .insert(deps_path.to_string(), import_modules.clone());
  }

  result
}

fn resolve_import_file_path(
  import_path: &str,
  file_path: &str,
  project_files: &HashSet<&str>,
) -> Option<String> {
  // 先转成 URL 的形态进行路径拼接处理
  let mut url = String::from("file://");
  url.push_str(file_path);
  let mut deps_real_url = Url::parse(&url).expect("解析失败");

  // 如果是相对路径则进行拼接
  if import_path.starts_with("./") || import_path.starts_with("../") || import_path.eq(".") {
    deps_real_url = deps_real_url.join(import_path).unwrap();
  }
  // 如果是绝对路径则直接转成 URL
  else {
    let mut url = String::from("file://");

    // 如果 import_path 以 / 开头，则直接将其添加到 url 中；
    // 否则，在 url 后添加 /，再添加 import_path。
    if import_path.to_string().starts_with("/") {
      url.push_str(import_path);
    } else {
      url.push_str("/");
      url.push_str(import_path);
    }

    deps_real_url = Url::parse(&url).unwrap();
  }

  let is_real_file = |match_path: &str| -> bool {
    return project_files.contains(match_path);
  };

  let deps_real_path: PathBuf = deps_real_url.to_file_path().unwrap();

  // 如果是真实文件则返回
  if deps_real_path.extension().is_some() && is_real_file(&deps_real_path.to_str().unwrap()) {
    return Some(deps_real_path.to_str().unwrap().to_string());
  }

  // 尝试补充后缀名进行匹配
  for ext in EXTENSIONS {
    if deps_real_path.extension().is_some() {
      continue;
    }

    let mut test_file_path = deps_real_path.clone();

    test_file_path.set_extension(ext);

    // 如果是真实文件则返回
    if is_real_file(&test_file_path.to_str().unwrap()) {
      return Some(test_file_path.to_str().unwrap().to_string());
    }
  }

  for ext in EXTENSIONS {
    if deps_real_path.extension().is_some() {
      continue;
    }

    let mut test_file_path = deps_real_path.clone().join("index");

    test_file_path.set_extension(ext);

    // 如果是真实文件则返回
    if is_real_file(&test_file_path.to_str().unwrap()) {
      return Some(test_file_path.to_str().unwrap().to_string());
    }
  }

  None
}

#[cfg(test)]
mod tests {

  use super::*;

  #[test]
  fn test_resolve_import_file_path() {
    let mut project_files = HashSet::new();

    project_files.insert("/root/src/a/b.js");
    project_files.insert("/root/src/a/b/index.js");
    project_files.insert("/root/src/a.js");
    project_files.insert("/root/src/c.tsx");
    project_files.insert("/root/src/d/index.tsx");
    project_files.insert("/root/src/index.js");

    assert_eq!(
      resolve_import_file_path("./c", "/root/src/index.js", &project_files),
      Some("/root/src/c.tsx".to_string())
    );

    assert_eq!(
      resolve_import_file_path("./d", "/root/src/index.js", &project_files),
      Some("/root/src/d/index.tsx".to_string())
    );

    assert_eq!(
      resolve_import_file_path("lodash", "/root/src/index.js", &project_files),
      None
    );

    assert_eq!(
      resolve_import_file_path("./a/b", "/root/src/index.js", &project_files),
      Some("/root/src/a/b.js".to_string())
    );

    assert_eq!(
      resolve_import_file_path("./a", "/root/src/index.js", &project_files),
      Some("/root/src/a.js".to_string())
    );
  }
}
