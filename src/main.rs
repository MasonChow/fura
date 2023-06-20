mod database;
mod project;

fn main() {
  project::reader::read(".".to_string());

  let init_table_sqls = include_str!("sql/init_table.sql");

  let result = database::sqlite::execute_batch(init_table_sqls);

  println!("result: {:?}", result);
}
