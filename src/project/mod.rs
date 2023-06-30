use crate::database;
use futures::executor::block_on;
use futures::future::join_all;

pub mod reader;

/// 通过执行 SQL 命令并创建 “Dir” 结构的新实例来初始化项目。
async fn init_project_base_data(root_path: &str, exclude_paths: Option<Vec<&str>>) {
  match database::sqlite::init() {
    Ok(_) => println!("init db success"),
    Err(err) => panic!("init db failed: {}", err),
  };

  // 创建一个“Dir”结构的新实例，并将其赋值给“dir”变量。
  let result = self::reader::Project::new(root_path, exclude_paths);

  let mut insert_dir_tasks = vec![];

  result.dirs.iter().for_each(|dir| {
    let task = database::sqlite::insert_dir(dir);
    insert_dir_tasks.push(task);
  });

  join_all(insert_dir_tasks).await;

  let mut insert_file_tasks = vec![];

  result.files.iter().for_each(|file| {
    let task = database::sqlite::insert_file(file);
    insert_file_tasks.push(task);
  });

  join_all(insert_file_tasks).await;
}

pub fn init_project_data(root_path: &str, exclude_paths: Option<Vec<&str>>) {
  block_on(init_project_base_data(root_path, exclude_paths));
}
