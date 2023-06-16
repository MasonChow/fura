use lazy_static::lazy_static;
use rusqlite::{Connection, Result};

lazy_static! {
  static ref SQLITE: Connection = {
    let conn = Connection::open("db.sqlite").unwrap();
    conn
      .execute(
        "CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )",
        [],
      )
      .unwrap();
    conn
  };
}
