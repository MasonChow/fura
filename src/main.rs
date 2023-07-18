mod database;
mod parser;
mod project;

fn main() {
  project::init_project_data(
    "/Users/zhoushunming/Documents/sc/shopline-sc-live-view",
    Some(vec!["node_modules", ".git"]),
  );
}
