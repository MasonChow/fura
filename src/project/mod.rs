use futures::executor::block_on;
use std::collections::HashMap;
mod init_base;

pub mod handler;
pub mod reader;

/// 初始化项目数据。
///
/// Arguments:
///
/// * `root_path`: `root_path` 参数是一个字符串，表示项目根目录的路径。它是函数遍历项目目录并收集数据的起点。
/// * `exclude_paths`: `exclude_paths`
/// 参数是一个可选参数，允许您指定要从项目数据初始化过程中排除的路径列表。如果您不想排除任何路径，可以传递“None”作为此参数的值。如果您想排除特定路径，您可以
pub fn init_project_data(root_path: &str, exclude_paths: Option<Vec<&str>>) {
  block_on(init_base::insert_project_base_data(
    root_path,
    exclude_paths,
  ));

  if let Some(package_json) = reader::read_package_json(root_path) {
    block_on(init_base::insert_package_json_data(&package_json));
  }

  let mut alias: HashMap<String, String> = HashMap::new();
  alias.insert("@".to_string(), root_path.to_string());

  let javascript_file = handler::javascript::ProjectJavascriptDataInfo::new(&Some(alias));

  println!("init project data success, {:?}", javascript_file);

  // let insert_file_refs: Vec<(u64, u64, String)> = Vec::new();

  // for key in javascript_file.files.keys() {
  //   let file = javascript_file.files.get(key).unwrap();
  //   let file_id = file.id;

  //   for import in file.imports.keys() {
  //     let import_file = javascript_file.files.get(import).unwrap();
  //     let import_file_id = import_file.id;
  //     let import_modules = file.imports.get(import).unwrap();

  //     // for import_module in import_modules {
  //     //   let import_module_id = with_auto_paths_file.npm_pkgs.get(import_module).unwrap().id;

  //     //   insert_file_refs.push((file_id, import_module_id, import_module.to_string()));
  //     // }

  //     println!("{} -> {} -> {:?}", key, import, import_modules);
  //   }
  // }
}
