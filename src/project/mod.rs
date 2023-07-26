use futures::executor::block_on;
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

  let mut javascript_file = handler::javascript::ProjectJavascriptDataInfo::new();

  let with_auto_paths_file = javascript_file.auto_complete_import_path(None);

  println!("init project data success, {:?}", with_auto_paths_file);
}
