import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../data.db'));

try {
    const users = db.prepare("SELECT id, username, full_name, status FROM profiles").all();
    console.log(JSON.stringify(users, null, 2));
} catch (err) {
    console.error("Error:", err);
} finally {
    db.close();
}
