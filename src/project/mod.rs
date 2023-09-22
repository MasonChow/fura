use futures::executor::block_on;
use std::collections::HashMap;
use tracing::{event, Level};
/// 处理器
pub mod handler;
mod init_database;
/// 读取器
pub mod reader;

/// 项目数据
pub struct Project {
  /// 项目根目录
  pub root_path: String,
  /// JavaScript 内容数据
  pub javascript: handler::javascript::ProjectJavascriptDataInfo,
}

/// 初始化项目数据。
///
/// Arguments:
///
/// * `root_path`: `root_path` 参数是一个字符串，表示项目根目录的路径。它是函数遍历项目目录并收集数据的起点。
/// * `exclude_paths`: `exclude_paths`
/// 参数是一个可选参数，允许您指定要从项目数据初始化过程中排除的路径列表。如果您不想排除任何路径，可以传递“None”作为此参数的值。
pub fn init_project_data(root_path: &str, exclude_paths: Option<Vec<&str>>) -> Project {
  event!(Level::INFO, "初始化项目数据");
  event!(Level::INFO, "root_path: {}", root_path);
  event!(Level::INFO, "exclude_paths: {:?}", exclude_paths);

  block_on(init_database::insert_project_base_data(
    root_path,
    exclude_paths,
  ));

  if let Some(package_json) = reader::read_package_json(root_path) {
    block_on(init_database::insert_package_json_data(&package_json));
  }

  let mut alias: HashMap<&str, &str> = HashMap::new();
  let alias_path = root_path.to_string() + "/src";
  alias.insert("@", &alias_path);

  let javascript_info: handler::javascript::ProjectJavascriptDataInfo =
    handler::javascript::ProjectJavascriptDataInfo::new(&Some(alias));

  let mut insert_file_refs: Vec<(
    // file_id
    u64,
    // ref_id
    u64,
    // module
    &str,
    // ref_type
    &str,
  )> = Vec::new();

  for (_, value) in javascript_info.files.iter() {
    let file_id = value.id;

    // 处理文件类型的模块
    for (module_key, modules) in value.imports.module.iter() {
      modules.iter().for_each(|module| {
        if let Some(file) = javascript_info.files.get(module_key) {
          insert_file_refs.push((file_id, file.id, module, "file_module"));
        }
      });
    }

    // 处理 npm 类型的模块
    for (module_key, modules) in value.imports.npm_pkg.iter() {
      modules.iter().for_each(|module| {
        if let Some(module_id) = javascript_info.npm_pkgs.get(module_key) {
          insert_file_refs.push((file_id, *module_id, module, "npm_module"));
        }
      });
    }

    // 其他导入模块
    for (module_key, modules) in value.imports.file.iter() {
      modules.iter().for_each(|module| {
        if let Some(file) = javascript_info.files.get(module_key) {
          insert_file_refs.push((file_id, file.id, module, "others"));
        }
      });
    }
  }

  if !insert_file_refs.is_empty() {
    block_on(init_database::insert_file_references(insert_file_refs)).unwrap();
  }

  println!("init project data success");

  Project {
    root_path: root_path.to_string(),
    javascript: javascript_info,
  }
}
