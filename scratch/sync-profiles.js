import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, '../data.db'));

// Add columns manually
console.log("Checking for columns...");
const profilesTableInfo = db.prepare("PRAGMA table_info(profiles)").all();
if (!profilesTableInfo.some(col => col.name === 'phone_number')) {
  db.exec("ALTER TABLE profiles ADD COLUMN phone_number TEXT");
  console.log("Added phone_number");
}
if (!profilesTableInfo.some(col => col.name === 'current_duty')) {
  db.exec("ALTER TABLE profiles ADD COLUMN current_duty TEXT DEFAULT 'Station Duty'");
  console.log("Added current_duty");
}
if (!profilesTableInfo.some(col => col.name === 'duty_location')) {
  db.exec("ALTER TABLE profiles ADD COLUMN duty_location TEXT DEFAULT 'Police Station'");
  console.log("Added duty_location");
}

// Update existing
console.log("Updating existing profiles...");
db.prepare('UPDATE profiles SET phone_number = ?, current_duty = ?, duty_location = ? WHERE id = ?')
  .run('9812000001', 'HQ Monitoring', 'Headquarters', 'usr-1');
db.prepare('UPDATE profiles SET phone_number = ?, current_duty = ?, duty_location = ? WHERE id = ?')
  .run('9812000002', 'Investigation', 'Sector 14', 'usr-2');
db.prepare('UPDATE profiles SET phone_number = ?, current_duty = ?, duty_location = ? WHERE id = ?')
  .run('9812000003', 'Station Duty', 'PS Sector 14', 'usr-3');

// Insert new ones if they don't exist
console.log("Adding new staff members...");
const staff = [
    { id: 'usr-4', username: 'staff_1', password: 'password', role: 'constable', full_name: 'Constable Rahul Phogat', badge_number: 'C-301', rank: 'Constable', station_id: 'stn-1', phone_number: '9812000004', current_duty: 'Raid', duty_location: 'Hansi Road' },
    { id: 'usr-5', username: 'staff_2', password: 'password', role: 'constable', full_name: 'Constable Vikas Yadav', badge_number: 'C-302', rank: 'Constable', station_id: 'stn-1', phone_number: '9812000005', current_duty: 'CL', duty_location: 'Home' },
    { id: 'usr-6', username: 'staff_3', password: 'password', role: 'head_constable', full_name: 'HC Meena Kumari', badge_number: 'HC-303', rank: 'Head Constable', station_id: 'stn-1', phone_number: '9812000006', current_duty: 'Station Duty', duty_location: 'Desk' },
    { id: 'usr-7', username: 'staff_4', password: 'password', role: 'io', full_name: 'ASI Baljeet Singh', badge_number: 'IO-304', rank: 'ASI', station_id: 'stn-1', phone_number: '9812000007', current_duty: 'Raid', duty_location: 'Jind Road' },
    { id: 'usr-8', username: 'staff_5', password: 'password', role: 'constable', full_name: 'Constable Sanjay Nain', badge_number: 'C-305', rank: 'Constable', station_id: 'stn-1', phone_number: '9812000008', current_duty: 'Patrol', duty_location: 'Market' },
];

const insert = db.prepare(`INSERT OR IGNORE INTO profiles (id, username, password, role, full_name, badge_number, rank, station_id, phone_number, current_duty, duty_location) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

staff.forEach(s => {
    insert.run(s.id, s.username, s.password, s.role, s.full_name, s.badge_number, s.rank, s.station_id, s.phone_number, s.current_duty, s.duty_location);
});

console.log("Profiles updated and synced successfully!");
