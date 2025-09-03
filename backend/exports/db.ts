import { SQLDatabase } from "encore.dev/storage/sqldb";

// Reference the existing database created in shared/db.ts
export const db = SQLDatabase.named("tinycdp");
