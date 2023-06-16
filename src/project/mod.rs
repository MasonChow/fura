/*! 读取项目内容 */
pub mod reader {
  pub fn read(project_root_path: String) {
    loop_read_dir(project_root_path)
  }

  /** 递归读取目录内容 */
  fn loop_read_dir(dir_path: String) {
    let paths = std::fs::read_dir(dir_path).unwrap();
    for path in paths {
      let path = path.unwrap().path();
      if !path.is_dir() {
        println!("file: {}", path.to_str().unwrap());
      } else {
        loop_read_dir(path.to_str().unwrap().to_string());
      }
    }
  }
}
