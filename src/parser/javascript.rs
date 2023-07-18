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

#[derive(Debug)]
/// `File` 结构代表 Rust 中的一个文件解析器，它将文件路径作为输入并初始化一个 `Code` 对象。
///
/// Properties:
///
/// * `file_path`: 表示将被解析的文件的路径的字符串。
/// * `code_parser`: `code_parser` 属性是 `Code` 结构的一个实例。它负责解析和分析“file_path”属性指定的文件中的代码。
pub struct File {
  pub file_path: String,
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

// `JavascriptFile` 结构代表一个 JavaScript 文件，包含其路径、代码、抽象语法树 (AST) 和导入等信息。
///
/// Properties:
///
/// * `code`: “code”属性是一个字符串，表示文件中包含的实际 JavaScript 代码。
/// * `imports`: “imports”属性是一个“HashMap”，用于存储 JavaScript
/// 文件的依赖项。每个依赖项都由“JavascriptDependency”结构表示，“HashMap”中的键是依赖项的名称。
#[derive(Debug)]
pub struct Code {
  pub code: String,
  /// 文件导入的模块，key 为模块路径，value 为导入的模块
  /// 例如：
  /// ```js
  /// import a from './a';
  /// import b, { c } from './b';
  /// import * as d from './d';
  /// import e, * as f from './f';
  /// ```
  /// 则 imports 为：
  /// ```json
  /// {
  ///   "./a": ["a"],
  ///   "./b": ["b", "c"],
  ///   "./d": ["d"],
  ///   "./f": ["e", "f"]
  /// }
  /// ```
  pub imports: HashMap<String, Vec<String>>,
}

impl Code {
  pub fn new(code: &str) -> Code {
    let ast: ParsedSource = parse(&code).expect("解析 ast 失败");
    let imports = analyze_imports(&ast).unwrap();

    Code {
      code: code.to_string(),
      imports,
    }
  }
}
