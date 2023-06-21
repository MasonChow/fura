use std::collections::HashMap;
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
/// * `project_root_path`: “project_root_path”属性是一个“String”，表示项目的根目录路径。它用于指定 `Dir` 结构中所有文件的基目录。
pub struct Dir {
  pub files: Vec<File>,
  pub project_root_path: String,
}

/// 这是 `Dir` 结构的实现块，定义了一个名为 `new` 的新方法，该方法采用 `&str` 类型的 `project_root_path` 参数并返回一个 `Dir` 实例。
impl Dir {
  pub fn new(project_root_path: &str, exclude: Option<Vec<&str>>) -> Dir {
    let mut files: Vec<File> = Vec::new();

    // 此代码定义了一个名为“is_exclude_dir”的闭包，它将字符串切片“dir_path”作为其参数。闭包检查“exclude”选项是否为“None”，如果是，则返回“false”。如果“exclude”不是“None”，它将解包该值并迭代向量中的每个字符串。如果“dir_path”包含向量中的任何字符串，则闭包返回“true”。否则，它返回“false”。此闭包用于在“loop_read_dir”函数中的递归目录搜索期间排除某些目录被搜索。
    let is_exclude_dir = |dir_path: &str| {
      if exclude.is_none() {
        return false;
      }

      let exclude = &exclude.unwrap();
      for exclude_dir in exclude {
        if dir_path.contains(exclude_dir) {
          return true;
        }
      }

      return false;
    };

    /// 该函数递归读取目录并将所有文件添加到向量中。
    ///
    /// Arguments:
    ///
    /// * `dir_path`: 需要递归搜索文件的目录路径。
    /// * `files`: `files` 是 `File`
    /// 结构的可变向量。函数“loop_read_dir”递归读取目录及其子目录，对于它找到的每个文件，它使用文件路径和找到的目录路径创建一个“File”结构，并将其添加
    fn loop_read_dir(dir_path: &str, files: &mut Vec<File>) {
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
        } else {
          loop_read_dir(path.to_str().unwrap(), files);
        }
      }
    }

    loop_read_dir(project_root_path, &mut files);

    return Dir {
      files,
      project_root_path: project_root_path.to_string(),
    };
  }
}
