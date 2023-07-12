use deno_ast::parse_module;
use deno_ast::swc::parser::JscTarget;
use deno_ast::swc_common::SourceMap;

pub fn parse(source: &str) -> Result<deno_ast::Module, deno_ast::Diagnostic> {
  let source_map = SourceMap::default();
  parse_module(
    source_map.clone(),
    None,
    &source,
    Some(JscTarget::Es2020),
    true,
    false,
  )
  .map_err(|err| {
    let diagnostic = deno_ast::Diagnostic::from_swc_error(&source_map, err);
    diagnostic
  })
}
