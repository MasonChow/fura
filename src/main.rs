mod database;
mod parser;
mod project;

use env_logger::Env;

fn main() {
  env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

  project::init_project_data(
    "/Users/zhoushunming/Documents/sc/shopline-sc-live-view",
    Some(vec!["node_modules", ".git"]),
  );
}
