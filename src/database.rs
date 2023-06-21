pub mod sqlite {
  use rusqlite::{Connection, Result};

  pub fn execute_batch(sql: &str) -> Result<()> {
    #[cfg(debug_assertions)]
    let conn = Connection::open("./debug/.fura.db")?;

    #[cfg(not(debug_assertions))]
    let conn = Connection::open_in_memory()?;

    return conn.execute_batch(sql);
  }
}
