mod database;
mod parser;
mod project;

use env_logger::Env;

use serde_json;
use std::fs::{create_dir_all, File};

fn main() {
  env_logger::Builder::from_env(Env::default()).init();

  let dir_path = ".fura";
  create_dir_all(dir_path).unwrap();

  let project_data = project::init_project_data(
    "/Users/zhoushunming/Documents/sc/shopline-sc-live-view",
    Some(vec!["node_modules", ".git"]),
  );

  if let Ok(data) = project_data.javascript.to_json() {
    let mut file = File::create(".fura/project_data.json").unwrap();
    serde_json::to_writer(&mut file, &data).unwrap();
  }

  // println!("project_data: {:?}", project_data.javascript.to_json());
}
