import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../data.db'));

try {
    const result = db.prepare("DELETE FROM profiles WHERE full_name LIKE '%Test Admin%'").run();
    console.log(`Successfully removed ${result.changes} record(s) matching 'Test Admin'.`);
} catch (err) {
    console.error("Error removing Test Admin:", err);
} finally {
    db.close();
}
