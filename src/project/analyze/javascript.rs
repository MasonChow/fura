use crate::database::sqlite;
use crate::project::ast_parser::javascript as javascript_parser;
use crate::project::ast_parser::javascript::ast;
use crate::project::reader;
use std::collections::HashMap;

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
fn analyze_ast_imports(ast: &javascript_parser::ParsedSource) -> Result<(), String> {
  let mut deps = JavascriptDependency {
    code: ast.text_info().text().to_string(),
    module: vec![],
    source: "".to_string(),
  };

  for module in ast.module().body.iter() {
    if let ast::ModuleItem::ModuleDecl(decl) = module {
      println!("import => {:?}", decl);
      if let ast::ModuleDecl::Import(import_decl) = decl {
        for specifiers in import_decl.specifiers.iter() {
          match specifiers {
            ast::ImportSpecifier::Named(named_specifier) => {
              println!(
                "import => \n {:?} \n {:?}",
                named_specifier, named_specifier
              );
            }
            // ast::ImportSpecifier::Default(default_specifier) => {
            //   println!("import => {:?}", default_specifier);
            // }
            ast::ImportSpecifier::Namespace(namespace_specifier) => {
              println!("import => {:?}", namespace_specifier);
            }
            _ => {}
          }
        }
      }
    }
  }
  Ok(())
}

pub fn analyze_all() {
  let js_file_map = query_js_files().unwrap();
  for (path, _) in js_file_map {
    let _result = JavascriptFile::new(&path);
  }
}

pub struct JavascriptDependency {
  pub code: String,
  pub module: Vec<String>,
  pub source: String,
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
pub struct JavascriptFile {
  pub path: String,
  pub code: String,
  pub ast: javascript_parser::ParsedSource,
  pub imports: HashMap<String, JavascriptDependency>,
}

impl JavascriptFile {
  pub fn new(path: &str) -> JavascriptFile {
    let code = reader::read_file(path).unwrap();
    let ast: javascript_parser::ParsedSource =
      javascript_parser::parse(&code).expect("解析 ast 失败");
    let _result = analyze_ast_imports(&ast);

    JavascriptFile {
      path: path.to_string(),
      code,
      ast,
      imports: HashMap::new(),
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
    let _test_result = JavascriptFile::new(test_code_file_path.to_str().unwrap());
  }
}