import { SQLDatabase } from "encore.dev/storage/sqldb";

// Create the main database instance
export const db = new SQLDatabase("tinycdp", {
  migrations: "./migrations",
});
