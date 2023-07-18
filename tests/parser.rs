use fura::parser::javascript;
use std::collections::HashMap;
use std::path::Path;

#[test]
fn test_js_code_parser() {
  let code = r#"
      import a from './a';
      import b, { c } from './b';
      import * as d from './d';
      import e, * as f from './f';
    "#;

  let result = javascript::Code::new(code);

  assert_eq!(result.imports, {
    let mut map = HashMap::new();
    map.insert("./a".to_string(), vec!["default".to_string()]);
    map.insert(
      "./b".to_string(),
      vec!["default".to_string(), "c".to_string()],
    );
    map.insert("./d".to_string(), vec!["*".to_string()]);
    map.insert(
      "./f".to_string(),
      vec!["default".to_string(), "*".to_string()],
    );
    map
  })
}

#[test]
fn test_js_file_parser() {
  let file_path = Path::new("./tests/mock/files/imports.ts");
  let result = javascript::File::new(file_path.to_str().unwrap());

  assert_eq!(result.code_parser.imports, {
    let mut map = HashMap::new();
    map.insert(
      "./c".to_string(),
      vec!["*".to_string(), "default".to_string()],
    );
    map.insert(
      "./a".to_string(),
      vec![
        "default".to_string(),
        "b".to_string(),
        "c".to_string(),
        "d".to_string(),
      ],
    );
    map.insert("./a/b".to_string(), vec!["default".to_string()]);
    map
  })
}
