import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../data.db'));

try {
    const user = db.prepare("SELECT id, full_name FROM profiles WHERE full_name LIKE '%Test Admin%'").get();
    if (user) {
        console.log(`Found user: ${user.full_name} (ID: ${user.id})`);
        const gdCount = db.prepare("SELECT COUNT(*) as c FROM general_diary WHERE officer_id = ?").get(user.id).c;
        console.log(`GD Entries linked: ${gdCount}`);
        
        // If entries exist, we can't hard delete without clearing them.
        // Let's just update the status to 'deleted' and we'll fix the API to filter.
        const result = db.prepare("UPDATE profiles SET status = 'deleted' WHERE id = ?").run(user.id);
        console.log(`Updated status to 'deleted' for user ${user.id}.`);
    } else {
        console.log("Test Admin not found.");
    }
} catch (err) {
    console.error("Error:", err);
} finally {
    db.close();
}
