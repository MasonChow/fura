use crate::database::sqlite;
use crate::parser;
use std::collections::HashMap;
use std::path::PathBuf;

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

/// 查询项目内所有 js 文件
fn query_npm_pkgs() -> Result<HashMap<String, String>, String> {
  let mut npm_pkg_map: HashMap<String, String> = HashMap::new();

  let conn = sqlite::get_db().expect("获取 DB 失败");

  let mut stmt: sqlite::Statement = conn
    .prepare(
      r#"
      SELECT
        name,
        version
      FROM
        "npm_pkg";
      "#,
    )
    .expect("查询失败");

  let result = stmt.query_map([], |row| Ok((row.get(0).unwrap(), row.get(1).unwrap())));

  for item in result.unwrap() {
    let (name, version) = item.unwrap();
    npm_pkg_map.insert(name, version);
  }

  Ok(npm_pkg_map)
}

#[derive(Debug)]
pub struct File {
  pub path: String,
  pub imports: HashMap<String, Vec<String>>,
}

#[derive(Debug)]
pub struct ProjectJavascriptDataInfo {
  pub files: HashMap<String, File>,
  pub npm_pkgs: HashMap<String, String>,
}

impl ProjectJavascriptDataInfo {
  pub fn new() -> Self {
    let js_file_map = query_js_files().unwrap();
    let npm_pkgs = query_npm_pkgs().unwrap();

    let mut files: HashMap<String, File> = HashMap::new();
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

    ProjectJavascriptDataInfo { files, npm_pkgs }
  }
  // 自动补全处理 js 的 import 语句，自动匹配存在的路径
  // './a/b' -> './b/index.(js|jsx|ts|tsx|cjs|mjs)'
  // './a' -> './a.(js|jsx|ts|tsx|cjs|mjs)'
  // 'antd' -> package.json -> dependencies -> antd
  // 'antd/lib/button' -> package.json -> dependencies -> antd
  pub fn auto_complete_import_path(
    &mut self,
    project_alias: Option<HashMap<String, String>>,
  ) -> &Self {
    let files = &self.files;
    let npm_pkgs = &self.npm_pkgs;
    let mut result_files: HashMap<String, File> = HashMap::new();
    let alias = &project_alias;

    for (file_path, file) in files {
      let file_imports = &file.imports;
      let file_real_path = PathBuf::from(&file_path);
      let mut real_imports: HashMap<String, Vec<String>> = HashMap::new();

      for (import_path, import_modules) in file_imports {
        // './a/b' -> './b/index.(js|jsx|ts|tsx|cjs|mjs)'
        // './a' -> './a.(js|jsx|ts|tsx|cjs|mjs)'
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

        let mut deps_real_path = PathBuf::from(&deps_path);

        // 如果是相对路径则进行拼接
        if deps_real_path.is_relative() {
          deps_real_path = file_real_path.join(&deps_real_path);
        }

        // 匹配出真实的依赖的文件路径
        for ext in EXTENSIONS {
          let mut deps_real_path_with_ext = deps_real_path.clone();
          deps_real_path_with_ext.set_extension(ext);

          // 真实的依赖文件路径存在，则跳出循环
          if files.contains_key(deps_real_path_with_ext.to_str().unwrap()) {
            deps_real_path = deps_real_path_with_ext;
            break;
          }
        }

        match deps_real_path.extension() {
          Some(_) => {}
          None => {
            // 如果没有后缀，则尝试匹配 package.json 的 dependencies
            for pkg in npm_pkgs.keys() {
              if deps_real_path.starts_with(pkg) {
                deps_real_path = PathBuf::from(pkg);
                break;
              }
            }
          }
        }

        real_imports.insert(
          deps_real_path.to_str().unwrap().to_string(),
          import_modules.clone(),
        );
      }

      result_files.insert(
        file_path.to_string(),
        File {
          path: file_path.to_string(),
          imports: real_imports,
        },
      );
    }

    self.files = result_files;

    self
  }
}
