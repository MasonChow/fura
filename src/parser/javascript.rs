use crate::project::reader;
use deno_ast::swc::ast;
use deno_ast::{parse_module, Diagnostic, MediaType, ParseParams, ParsedSource, SourceTextInfo};
use std::collections::HashMap;

/// 调用 deno_ast 解析 ast
fn parse(content: &str) -> Result<ParsedSource, Diagnostic> {
  let params = ParseParams {
    specifier: "./index.js".to_string(), // 待处理的文件路径
    text_info: SourceTextInfo::from_string(content.to_string()),
    media_type: MediaType::Tsx,
    capture_tokens: true,
    scope_analysis: false,
    maybe_syntax: None,
  };
  // 创建 Parser
  let parser_module = parse_module(params)?;
  Ok(parser_module)
}

/// 分析 AST 中的 import 语句
fn analyze_imports(ast: &ParsedSource) -> Result<HashMap<String, Vec<String>>, String> {
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
            ast::ImportSpecifier::Default(_default_specifier) => {
              modules.push("default".to_string());
            }
            ast::ImportSpecifier::Namespace(_namespace_specifier) => {
              modules.push("*".to_string());
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

/**

用来代表一个 JavaScript 代码解析内容，它将 JavaScript 代码作为输入并解析它。

Examples:

```rust
  use fura::parser::javascript;
  use std::path::Path;
  use serde_json;

  let code = r#"
    import a from './a';
    import b, { c } from './b';
    import  * as d from './d';
    import e,  *  as f from './f';
  "#;

  let result = javascript::Code::new(code);
  let expected = serde_json::json!({
    "./a": [
      "default"
    ],
    "./b": [
      "default",
      "c"
    ],
    "./d": [
      "*"
    ],
    "./f": [
      "default",
      "*"
    ]
  });

  assert_eq!(expected, serde_json::json!(&result.imports));
```
*/
#[derive(Debug)]
pub struct Code {
  /// 被解析的 JavaScript 代码的字符串。
  pub code: String,
  /*
   被解析的 JavaScript 代码中的导入语句的哈希表。`HashMap<导入路径, Vec<导入模块>>`

   - 例如，如果导入语句是 `import a from './a'`，那么键将是 `./a`，值将是 `default`。
   - 如果导入语句是 `import * as a from './a'`，那么键将是 `./a`，值将是 `*`。
   - 如果导入语句是 `import a, { b } from './a'`，那么键将是 `./a`，值将是 `default` 和 `b`。
   - 如果导入语句是 `import a, * as b from './a'`，那么键将是 `./a`，值将是 `a` 和 `*`。
  */
  pub imports: HashMap<String, Vec<String>>,
}

impl Code {
  /*
   * 创建一个新的 `Code` 实例。
   *
   * - @param code 被解析的 JavaScript 代码的字符串。
   * - @returns `Code` 实例。
   */
  pub fn new(code: &str) -> Code {
    let ast: ParsedSource = parse(&code).expect("解析 ast 失败");
    let imports = analyze_imports(&ast).unwrap();

    Code {
      code: code.to_string(),
      imports,
    }
  }
}

/**

用来代表一个 JavaScript 文件解析内容，它将 JavaScript 文件作为输入并解析它。

Examples:

```rust
  use fura::parser::javascript;
  use std::path::Path;
  let file_path = Path::new("./tests/mock/files/imports.ts");
  let result = javascript::File::new(file_path.to_str().unwrap());
```

*/
#[derive(Debug)]
pub struct File {
  /// 被解析的 JavaScript 文件的路径。
  pub file_path: String,
  /// [`Code`](struct@Code) 实例。
  pub code_parser: Code,
}

impl File {
  pub fn new(file_path: &str) -> File {
    let code = reader::read_file(file_path).unwrap();
    let code_parser = Code::new(&code);

    File {
      file_path: file_path.to_string(),
      code_parser,
    }
  }
}
