use deno_ast::{parse_module, MediaType, ParseParams, SourceTextInfo};

pub fn parse(content: &str) -> Result<(), String> {
  let params = ParseParams {
    specifier: "./index.js".to_string(),
    text_info: SourceTextInfo::from_string(content.to_string()),
    media_type: MediaType::Tsx,
    capture_tokens: true,
    scope_analysis: true,
    maybe_syntax: None,
  };
  // 创建 Parser
  let parser_module = parse_module(params);
  println!("{:#?}", parser_module);
  Ok(())
}
