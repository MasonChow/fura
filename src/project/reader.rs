use std::fs;

/// `File` 结构体包含 Rust 中文件的路径和目录路径。
///
/// Properties:
///
/// * `path`: “path”属性是一个“String”，表示文件的完整路径，包括文件名和扩展名。
/// * `dir_path`: “File”结构中的“dir_path”属性表示文件所在的目录路径。它是一个“String”类型，并被标记为“pub”，这意味着它可以从结构体外部访问和修改。
pub struct File {
  pub path: String,
  pub dir_path: String,
}

/// `Dir` 结构表示包含文件向量和项目根路径的目录。
///
/// Properties:
///
/// * `files`: 表示目录中文件的 File 结构向量。
/// * `project_root_path`:
/// “project_root_path”属性是一个“String”，表示项目的根目录路径。用于存储项目所在目录的路径。在处理项目中的文件和目录时，此属性非常有用，因为它提供了参考点
pub struct Dir {
  pub files: Vec<File>,
  pub project_root_path: String,
}

/// 这是 `Dir`
/// 结构的构造函数方法的实现。它需要两个参数：“project_root_path”，它是一个表示项目根目录的字符串，“exclude”，它是一个可选的字符串向量，表示要从搜索中排除的目录。
impl Dir {
  pub fn new(project_root_path: &str, exclude: Option<Vec<&str>>) -> Dir {
    let mut files: Vec<File> = Vec::new();

    fn loop_read_dir(dir_path: &str, files: &mut Vec<File>, exclude: &Option<Vec<&str>>) {
      let paths = fs::read_dir(dir_path).unwrap();
      for path in paths {
        let path = path.unwrap().path();

        if !path.is_dir() {
          println!("file: {}", path.to_str().unwrap());
          let file = File {
            path: path.to_str().unwrap().to_string(),
            dir_path: dir_path.to_string(),
          };

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

        loop_read_dir(path.to_str().unwrap(), files, &exclude);
      }
    }

    loop_read_dir(project_root_path, &mut files, &exclude);

    return Dir {
      files,
      project_root_path: project_root_path.to_string(),
    };
  }
}
