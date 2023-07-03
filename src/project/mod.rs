use crate::database;
use crate::database::sqlite::{Dir, File};
use futures::executor::block_on;
use futures::future::join_all;

pub mod reader;

// 异步执行 sql 批量插入项目数据
async fn init_project_base_data(root_path: &str, exclude_paths: Option<Vec<&str>>) {
  match database::sqlite::init() {
    Ok(_) => println!("init db success"),
    Err(err) => panic!("init db failed: {}", err),
  };

  // 创建一个“Dir”结构的新实例，并将其赋值给“dir”变量。
  let result = self::reader::Project::new(root_path, exclude_paths);

  let mut insert_dir_tasks = vec![];

  result.dirs.iter().for_each(|dir| {
    let insert_dir = Dir {
      name: dir.name.clone(),
      path: dir.path.clone(),
      parent_path: dir.parent_path.clone(),
    };
    let task = database::sqlite::insert_dir(insert_dir);
    insert_dir_tasks.push(task);
  });

  join_all(insert_dir_tasks).await;

  let mut insert_file_tasks = vec![];

  result.files.iter().for_each(|file| {
    let insert_file = File {
      name: file.name.clone(),
      path: file.path.clone(),
      parent_path: file.parent_path.clone(),
      size: file.size,
      ext: file.ext.clone(),
    };
    let task = database::sqlite::insert_file(insert_file);
    insert_file_tasks.push(task);
  });

  join_all(insert_file_tasks).await;
}

/// 初始化项目数据。
///
/// Arguments:
///
/// * `root_path`: `root_path` 参数是一个字符串，表示项目根目录的路径。它是函数遍历项目目录并收集数据的起点。
/// * `exclude_paths`: `exclude_paths`
/// 参数是一个可选参数，允许您指定要从项目数据初始化过程中排除的路径列表。如果您不想排除任何路径，可以传递“None”作为此参数的值。如果您想排除特定路径，您可以
pub fn init_project_data(root_path: &str, exclude_paths: Option<Vec<&str>>) {
  block_on(init_project_base_data(root_path, exclude_paths));
}
