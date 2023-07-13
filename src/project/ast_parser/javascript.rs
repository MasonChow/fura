pub use deno_ast::{
  parse_module, Diagnostic, MediaType, ParseParams, ParsedSource, SourceTextInfo,
};

/// 函数“parse”将字符串作为输入并返回已解析的源或诊断错误。
///
/// Arguments:
///
/// * `content`: `content` 参数是一个字符串，表示您要解析的源代码。它是您要分析或处理的文件的内容。
///
/// Returns:
///
/// 函数“parse”返回一个“Result”类型，有两种可能的结果：
/// - 如果解析成功，它将返回一个包含“ParsedSource”对象的“Ok”变体。
/// - 如果解析遇到错误，它会返回一个包含“Diagnostic”对象的“Err”变体。
pub fn parse(content: &str) -> Result<ParsedSource, Diagnostic> {
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
