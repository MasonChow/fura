use crate::database::sqlite;
use crate::parser;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use url::Url;

const EXTENSIONS: [&str; 4] = ["js", "ts", "jsx", "tsx"];

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

/*
解析 import 语句的路径，返回真实的文件路径

参数:

- import_path：导入路径。
- file_path：当前文件的路径。
- project_files：包含了项目中所有的文件的路径的 HashSet。

返回：Option<String>
*/

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

  let deps_real_path: PathBuf = deps_real_url.to_file_path().unwrap();

  // 检查是否存在匹配的文件
  if let Some(match_with_rule) =
    auto_match_project_file_by_import_path(&deps_real_path, project_files)
  {
    return Some(match_with_rule);
  }

  None
}

/*
参考 node 匹配规格，自动补全文件后缀匹配

> 需要传入绝对路径

EXAMPLE:

project_files:

- /a/b.js
- /a/c/index.js
- /a.js
- /a.tsx
- /a.ts

import_path & result:

- /a/b.js -> /a/b.js
- /a/b -> /a/b.js
- /a/c -> /a/c/index.js
- /a/c.js -> None
- /a.ts -> /a.ts
- /a -> /a.js

*/
fn auto_match_project_file_by_import_path(
  import_path: &PathBuf,
  project_files: &HashSet<&str>,
) -> Option<String> {
  // 判断文件是否存在项目内
  let is_match = |match_path: &str| -> bool {
    return project_files.contains(match_path);
  };

  if import_path.extension().is_some() && is_match(import_path.to_str().unwrap()) {
    return Some(import_path.to_str().unwrap().to_string());
  }

  // 尝试补充后缀名进行匹配
  for ext in EXTENSIONS {
    let mut test_file_path = import_path.clone();
    test_file_path.set_extension(ext);
    let test_file_path_str = test_file_path.to_str().unwrap();

    if is_match(test_file_path_str) {
      return Some(test_file_path_str.to_string());
    }
  }

  // 尝试补充 index 进行匹配
  for ext in EXTENSIONS {
    let mut test_file_path = import_path.clone().join("index");
    test_file_path.set_extension(ext);
    let test_file_path_str = test_file_path.to_str().unwrap();

    if is_match(test_file_path_str) {
      return Some(test_file_path_str.to_string());
    }
  }

  None
}

#[cfg(test)]
mod tests {

  use super::*;
  use pretty_assertions::assert_eq;

  // 初始化测试数据
  fn get_project_files() -> (&'static str, HashSet<&'static str>) {
    let mut project_files: HashSet<&str> = HashSet::new();
    let target_file = "/root/src/index.js";

    // 优先级匹配场景数据 1
    project_files.insert("/root/a.js");
    project_files.insert("/root/a.ts");
    project_files.insert("/root/a.tsx");
    project_files.insert("/root/a.jsx");

    // index 匹配场景数据
    project_files.insert("/root/b/index.ts");
    project_files.insert("/root/b/index.tsx");
    project_files.insert("/root/b/index.js");
    project_files.insert("/root/b/index.jsx");

    // 优先级匹配场景数据 2
    project_files.insert("/root/c.ts");
    project_files.insert("/root/c.jsx");
    project_files.insert("/root/c.tsx");

    // 优先级匹配场景数据 3
    project_files.insert("/root/d.jsx");
    project_files.insert("/root/d.tsx");

    // 混合 index 优先级匹配场景数据
    project_files.insert("/root/e.js");
    project_files.insert("/root/e.ts");
    project_files.insert("/root/e/index.js");
    project_files.insert("/root/e/index.ts");

    return (target_file, project_files);
  }

  #[test]
  fn test_auto_match_project_file_by_import_path() {
    println!("测试 自动补全文件后缀匹配 resolve_import_file_path");
    let (_, project_files) = get_project_files();

    let assert_fn = |input: &PathBuf, output: Option<String>| {
      let result = auto_match_project_file_by_import_path(input, &project_files);
      assert_eq!(
        result,
        output,
        "引用路径 {} 测试不通过，期望 {}，实际 {}",
        input.to_str().unwrap(),
        output.clone().unwrap_or("None".to_string()),
        result.clone().unwrap_or("None".to_string())
      );
    };

    // 测试匹配优先级是否正常
    assert_fn(&PathBuf::from("/root/a"), Some("/root/a.js".to_string()));
    assert_fn(&PathBuf::from("/root/c"), Some("/root/c.ts".to_string()));
    assert_fn(&PathBuf::from("/root/d"), Some("/root/d.jsx".to_string()));
    assert_fn(&PathBuf::from("/root/e"), Some("/root/e.js".to_string()));
    assert_fn(&PathBuf::from("/root/f"), None);

    // 测试匹配 index 是否正常
    assert_fn(
      &PathBuf::from("/root/b"),
      Some("/root/b/index.js".to_string()),
    );

    // 测试固定路径下的场景
    assert_fn(&PathBuf::from("/root/a.ts"), Some("/root/a.ts".to_string()));
    assert_fn(
      &PathBuf::from("/root/b/index.ts"),
      Some("/root/b/index.ts".to_string()),
    );
    assert_fn(&PathBuf::from("/root/b.ts"), None);
  }

  #[test]
  fn test_resolve_import_file_path() {
    println!("测试 import 语句路径解析函数 resolve_import_file_path");

    let (target_file, project_files) = get_project_files();

    let assert_fn = |input: &str, output: Option<String>| {
      let result = resolve_import_file_path(input, target_file, &project_files);
      assert_eq!(
        result,
        output,
        "引用路径 {} 测试不通过，期望 {}，实际 {}",
        input,
        output.clone().unwrap_or("None".to_string()),
        result.clone().unwrap_or("None".to_string())
      );
    };

    // 相对路径解析，不带后缀名，有匹配文件，返回匹配文件路径，优先返回 js
    assert_fn("./c", Some("/root/src/c.js".to_string()));
    assert_fn("./d", Some("/root/src/d/index.tsx".to_string()));
    assert_fn("lodash", None);
    assert_fn("./a/b", Some("/root/src/a/b.js".to_string()));
    assert_fn("./a", Some("/root/src/a.js".to_string()));
  }
}
