mod database;
mod project;

fn main() {
  let init_table_sql = include_str!("sql/init_table.sql");

  // 初始化 db，执行 SQL 语句
  match database::sqlite::execute_batch(init_table_sql) {
    Ok(_) => println!("init table success"),
    Err(err) => panic!("init table failed: {}", err),
  }

  // 创建一个“Dir”结构的新实例，并将其赋值给“dir”变量。
  let dir = project::reader::Dir::new(
    "/Users/zhoushunming/Documents/sc/shopline-sc-live-view",
    Some(vec!["node_modules"]),
  );
  let files = dir.files;

  files.iter().for_each(|file| {
    println!("file: {}", file.path);
  });
}
