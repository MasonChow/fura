use fura::parser::javascript;
use std::collections::HashMap;
use std::path::Path;

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
