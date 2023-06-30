use std::fs;
use std::path::Path;

/// `File` 结构体包含 Rust 中文件的路径和目录路径。
///
/// Properties:
///
/// * `path`: “path”属性是一个“String”，表示文件的完整路径，包括文件名和扩展名。
/// * `dir_path`: “File”结构中的“dir_path”属性表示文件所在的目录路径。它是一个“String”类型，并被标记为“pub”，这意味着它可以从结构体外部访问和修改。
pub struct File {
  pub name: String,
  pub path: String,
  pub parent_path: String,
  pub size: u64,
  pub ext: String,
  pub file_type: String,
}

/// `Dir` 结构包含一个路径及其父路径作为字符串。
///
/// Properties:
///
/// * `path`: `path` 属性是一个表示目录路径的 `String`。它可以是绝对路径或相对路径。
/// * `parent_path`:
/// “Dir”结构中的“parent_path”属性表示“Dir”结构所表示的目录的父目录的路径。例如，如果“Dir”结构表示目录“/home/user/documents”，则“parent_path”属性将为“/home/user”。
pub struct Dir {
  pub name: String,
  pub path: String,
  pub parent_path: String,
}

/// `Project` 结构表示包含文件向量和项目根路径的目录。
///
/// Properties:
///
/// * `files`: 表示目录中文件的 File 结构向量。
/// * `project_root_path`:
/// “project_root_path”属性是一个“String”，表示项目的根目录路径。用于存储项目所在目录的路径。
pub struct Project {
  pub files: Vec<File>,
  pub dirs: Vec<Dir>,
  pub project_root_path: String,
}

fn create_file_from_path(path: &Path) -> File {
  let name = path.file_name().unwrap().to_str().unwrap().to_string();
  let parent_path = path.parent().unwrap().to_str().unwrap().to_string();
  let mut file_ext: String = "".to_string();

  if let Some(ext) = path.extension() {
    file_ext = ext.to_str().unwrap().to_string();
  }

  File {
    name,
    path: path.to_str().unwrap().to_string(),
    parent_path,
    size: path.metadata().unwrap().len(),
    ext: file_ext,
    file_type: "".to_string(),
  }
}

impl Project {
  /// 函数递归读取目录及其子目录，将任何找到的文件添加到向量中，并返回包含文件向量和项目根路径的“Dir”结构。
  ///
  /// Arguments:
  ///
  /// * `project_root_path`: 要扫描文件的项目的根目录路径。
  /// * `exclude`: `exclude` 是 `Option<Vec<&str>>`
  /// 类型的可选参数，可用于排除搜索某些目录。如果它是“Some”，则它包含要排除的目录名称向量。如果为“None”，则不排除任何目录。
  ///
  /// Returns:
  ///
  /// 函数“new”返回一个“Dir”结构，其中包含“File”结构的向量和作为字符串的项目根路径。
  pub fn new(project_root_path: &str, exclude: Option<Vec<&str>>) -> Project {
    let mut files: Vec<File> = Vec::new();
    let mut dirs: Vec<Dir> = Vec::new();

    // 递归读取目录及其子目录的内容，并将找到的任何文件添加到 `files`
    fn loop_read_dir(
      dir_path: &str,
      files: &mut Vec<File>,
      dirs: &mut Vec<Dir>,
      exclude: &Option<Vec<&str>>,
    ) {
      let paths = fs::read_dir(dir_path).unwrap();

      for path in paths {
        let path = path.unwrap().path();
        let parent_path = path.parent().unwrap().to_str().unwrap().to_string();
        let name = path.file_name().unwrap().to_str().unwrap().to_string();

        if !path.is_dir() {
          let file = create_file_from_path(&path);
          files.push(file);
          continue;
        }

        // 如果传入exclude，则排除指定的目录。
        if !exclude.is_none() {
          let exclude = exclude.as_ref().unwrap();
          let mut is_exclude_dir = false;

          for exclude_dir in exclude {
            if dir_path.contains(exclude_dir) {
              is_exclude_dir = true;
              break;
            }
          }

          if is_exclude_dir {
            continue;
          }
        }

        let dir = Dir {
          name,
          path: path.to_str().unwrap().to_string(),
          parent_path,
        };

        dirs.push(dir);

        loop_read_dir(path.to_str().unwrap(), files, dirs, &exclude);
      }
    }

    loop_read_dir(project_root_path, &mut files, &mut dirs, &exclude);

    return Project {
      files,
      dirs,
      project_root_path: project_root_path.to_string(),
    };
  }
}
