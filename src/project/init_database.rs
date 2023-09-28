use crate::database;
use crate::database::sqlite;
use futures::future::{join, join_all};
use tracing::{debug, error, info};

use crate::project::reader::{
  Dir as ProjectDir, File as ProjectFile, PackageJson as ProjectPackageJson, Project,
};

// 异步执行 sql 批量插入项目数据
pub async fn insert_project_base_data(root_path: &str, exclude_paths: Option<Vec<&str>>) {
  match database::sqlite::init() {
    Ok(_) => debug!("初始化数据库成功"),
    Err(err) => error!("初始化数据库失败 {:?}", err),
  };

  // 创建一个“Dir”结构的新实例
  let result = Project::new(root_path, exclude_paths);
  let batch_task = join(
    // 异步执行插入项目目录
    insert_project_dir(&result.dirs),
    // 异步执行插入项目文件
    insert_project_file(&result.files),
  );

  match batch_task.await {
    (Ok(_), Ok(_)) => info!("写入项目基础信息完成"),
    (Err(err), _) => error!("写入文件目录信息失败 {:?}", err),
    (_, Err(err)) => error!("写入文件信息失败 {:?}", err),
  }
}

// 异步执行插入项目目录
async fn insert_project_dir(dirs: &Vec<ProjectDir>) -> Result<(), Box<dyn std::error::Error>> {
  let mut insert_dir_tasks = vec![];

  for dir in dirs {
    let insert_dir = sqlite::Dir {
      name: dir.name.to_string(),
      path: dir.path.to_string(),
      parent_path: dir.parent_path.to_string(),
    };
    let task = database::sqlite::insert_dir(insert_dir);
    insert_dir_tasks.push(task);
  }

  join_all(insert_dir_tasks).await;

  Ok(())
}

// 异步执行插入项目文件
pub async fn insert_project_file(
  files: &Vec<ProjectFile>,
) -> Result<(), Box<dyn std::error::Error>> {
  let mut insert_file_tasks = vec![];

  for file in files {
    let insert_file = sqlite::File {
      name: file.name.to_string(),
      path: file.path.to_string(),
      parent_path: file.parent_path.to_string(),
      size: file.size,
      ext: file.ext.to_string(),
    };
    let task = database::sqlite::insert_file(insert_file);
    insert_file_tasks.push(task);
  }

  join_all(insert_file_tasks).await;

  Ok(())
}

// 异步执行插入 package.json 中的依赖项
pub async fn insert_package_json_data(package_json: &ProjectPackageJson) {
  let mut insert_tasks = vec![];

  // 分析插入 package.json 中的 dependencies 依赖项
  for (key, value) in package_json.dependencies.iter() {
    let insert_data = sqlite::NpmPkg {
      name: key.to_string(),
      version: value.to_string(),
      pkg_type: "dependencies".to_string(),
    };
    let task = database::sqlite::insert_npm_pkg(insert_data);
    insert_tasks.push(task);
  }

  // 分析插入 package.json 中的 dev_dependencies 依赖项
  for (key, value) in package_json.dev_dependencies.iter() {
    let insert_data = sqlite::NpmPkg {
      name: key.to_string(),
      version: value.to_string(),
      pkg_type: "dev_dependencies".to_string(),
    };
    let task = database::sqlite::insert_npm_pkg(insert_data);
    insert_tasks.push(task);
  }

  join_all(insert_tasks).await;
}

pub async fn insert_file_references(
  file_refs: Vec<(u64, u64, &str, &str)>,
) -> Result<(), Box<dyn std::error::Error>> {
  let mut insert_tasks = vec![];

  for file_ref in file_refs {
    let insert_data = sqlite::FileRefs {
      file_id: file_ref.0,
      ref_id: file_ref.1,
      module: file_ref.2,
      ref_type: file_ref.3,
    };
    let task = database::sqlite::insert_file_reference(insert_data);
    insert_tasks.push(task);
  }

  join_all(insert_tasks).await;

  Ok(())
}