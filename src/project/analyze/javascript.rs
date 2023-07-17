use crate::database::sqlite;
use crate::project::ast_parser::javascript as javascript_parser;
use crate::project::ast_parser::javascript::ast;
use crate::project::reader;
use std::collections::HashMap;
use std::vec;

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

/// 分析 AST 中的 import 语句
fn analyze_ast_imports(
  ast: &javascript_parser::ParsedSource,
) -> Result<HashMap<String, Vec<String>>, String> {
  let mut imports_map: HashMap<String, Vec<String>> = HashMap::new();

  for module in ast.module().body.iter() {
    // 分析 JavaScript 文件的 AST（抽象语法树）中的导入语句。
    if let ast::ModuleItem::ModuleDecl(decl) = module {
      if let ast::ModuleDecl::Import(import_decl) = decl {
        let source = import_decl.src.value.to_string();
        let modules = imports_map.entry(source).or_insert(vec![]);

        for specifiers in import_decl.specifiers.iter() {
          // 处理 JavaScript 文件的 AST（抽象语法树）中不同类型的导入说明符。
          match specifiers {
            ast::ImportSpecifier::Named(named_specifier) => match &named_specifier.imported {
              None => {
                modules.push(named_specifier.local.sym.to_string());
              }
              Some(imported) => match imported {
                ast::ModuleExportName::Ident(ident) => {
                  modules.push(ident.sym.to_string());
                }
                others => {
                  println!("存在未处理匹配的内容 {:?}", others);
                }
              },
            },
            ast::ImportSpecifier::Default(default_specifier) => {
              modules.push(default_specifier.local.sym.to_string());
            }
            ast::ImportSpecifier::Namespace(namespace_specifier) => {
              modules.push(namespace_specifier.local.sym.to_string());
            }
            o => {
              println!("存在未处理匹配的内容, {:?}", o);
            }
          }
        }
      }
    }
  }

  Ok(imports_map)
}

pub fn analyze_all() {
  let js_file_map = query_js_files().unwrap();
  for (path, _) in js_file_map {
    let _result = JavascriptFile::new(&path);
  }
}

/// `JavascriptFile` 结构代表一个 JavaScript 文件，包含其路径、代码、抽象语法树 (AST) 和导入等信息。
///
/// Properties:
///
/// * `path`: 表示 JavaScript 文件的文件路径的字符串。
/// * `code`: “code”属性是一个字符串，表示文件中包含的实际 JavaScript 代码。
/// * `ast`: `ast` 属性的类型为 `ast_parser::javascript::ParsedSource`。它表示文件中 JavaScript 代码的抽象语法树 (AST)。 AST
/// 是代码的结构化表示，可以更轻松地分析和操作。
/// * `imports`: “imports”属性是一个“HashMap”，用于存储 JavaScript
/// 文件的依赖项。每个依赖项都由“JavascriptDependency”结构表示，“HashMap”中的键是依赖项的名称。
#[derive(Debug)]
pub struct JavascriptFile {
  pub file_path: String,
  pub code: String,
  /// 文件导入的模块，key 为模块路径，value 为导入的模块
  pub imports: HashMap<String, Vec<String>>,
}

impl JavascriptFile {
  pub fn new(file_path: &str) -> JavascriptFile {
    let code = reader::read_file(file_path).unwrap();
    let ast: javascript_parser::ParsedSource =
      javascript_parser::parse(&code).expect("解析 ast 失败");
    let imports = analyze_ast_imports(&ast).unwrap();

    JavascriptFile {
      file_path: file_path.to_string(),
      code,
      imports,
    }
  }
}

#[cfg(test)]
mod test {
  use super::*;
  use std::path::Path;

  #[test]
  fn analyze_js_file_imports() {
    let test_code_file_path = Path::new("test/data/js/imports.ts");
    let test_result = JavascriptFile::new(test_code_file_path.to_str().unwrap());

    println!("存在未处理匹配的内容 {:?}", test_result);
  }
}
