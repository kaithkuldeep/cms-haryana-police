import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { suggestGDSubjectAI, polishGDDescriptionAI } from '../services/aiEngine.js';

const router = express.Router();

// ─── Get Next GD Number ────────────────────────────────────────────────────────
const getNextGDNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `GD/${year}/${month}/`;
    
    const lastEntry = db.prepare('SELECT gd_number FROM general_diary WHERE gd_number LIKE ? ORDER BY gd_number DESC LIMIT 1')
        .get(`${prefix}%`);
    
    let nextNum = 1;
    if (lastEntry) {
        const lastNum = parseInt(lastEntry.gd_number.split('/').pop());
        nextNum = lastNum + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

// ─── List GD Entries ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    try {
        const { 
            entryType, 
            startDate, 
            endDate, 
            officerId, 
            search,
            page = 1,
            limit = 20 
        } = req.query;

        let query = 'SELECT * FROM general_diary WHERE 1=1';
        const params = [];

        if (entryType) {
            query += ' AND entry_type = ?';
            params.push(entryType);
        }

        if (startDate) {
            query += ' AND date_time >= ?';
            params.push(`${startDate} 00:00:00`);
        }

        if (endDate) {
            query += ' AND date_time <= ?';
            params.push(`${endDate} 23:59:59`);
        }

        if (officerId) {
            query += ' AND officer_id = ?';
            params.push(officerId);
        }

        if (search) {
            query += ' AND (gd_number LIKE ? OR person_name LIKE ? OR mobile_number LIKE ? OR description LIKE ? OR subject LIKE ?)';
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal, searchVal, searchVal);
        }

        query += ' ORDER BY date_time DESC';

        // Pagination
        const offset = (page - 1) * limit;
        const total = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params).count;
        
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const entries = db.prepare(query).all(...params);
        
        res.json({
            entries,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Create GD Entry ──────────────────────────────────────────────────────────
router.post('/', (req, res) => {
    try {
        const items = Array.isArray(req.body) ? req.body : [req.body];
        
        // Filter out empty entries to prevent "required" error for added but unfilled rows in UI
        const validItems = items.filter(item => item.entry_type && item.description);
        
        if (validItems.length === 0) {
            return res.status(400).json({ error: 'At least one complete entry (Type and Description) is required' });
        }

        const results = [];
        const officer_id = req.user.id;
        console.log("====================\nRECEIVED GD ENTRIES:", JSON.stringify(validItems, null, 2), "\n====================");
        const officer = db.prepare('SELECT full_name, station_id FROM profiles WHERE id = ?').get(officer_id);

        const insertStmt = db.prepare(`
            INSERT INTO general_diary (
                id, gd_number, date_time, entry_type, person_name, mobile_number, 
                subject, description, location, officer_name, officer_id, station_id, related_fir_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertTransaction = db.transaction((entries) => {
            for (const entry of entries) {
                const {
                    entry_type,
                    person_name,
                    mobile_number,
                    subject,
                    description,
                    location,
                    related_fir_id,
                    custom_date,
                    officer_name 
                } = entry;

                const id = uuidv4();
                const gd_number = getNextGDNumber();
                const date_time = custom_date || new Date().toISOString().replace('T', ' ').substring(0, 19);
                const final_officer_name = officer_name || officer.full_name;

                insertStmt.run(
                    id, gd_number, date_time, entry_type, person_name, mobile_number,
                    subject, description, location, final_officer_name, officer_id, officer.station_id, related_fir_id
                );
                
                results.push({ id, gd_number });
            }
        });

        insertTransaction(validItems);
        res.status(201).json({ success: true, inserted: results.length, entries: results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Get GD Stats / Alerts ─────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
    try {
        const recentActivity = db.prepare('SELECT * FROM general_diary ORDER BY date_time DESC LIMIT 10').all();
        
        const unusualActivity = db.prepare(`
            SELECT person_name, mobile_number, COUNT(*) as count 
            FROM general_diary 
            WHERE entry_type = 'Complaint received' AND mobile_number IS NOT NULL
            GROUP BY mobile_number 
            HAVING count > 2
        `).all();

        const staffMovement = db.prepare(`
            SELECT officer_name, entry_type, MAX(date_time) as last_movement
            FROM general_diary
            WHERE entry_type IN ('Arrival (staff/visitor)', 'Departure (staff/visitor)', 'Duty Start', 'Duty End')
            GROUP BY officer_id, entry_type
        `).all();

        res.json({
            recentActivity,
            unusualActivity,
            staffMovement
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Export Routes ────────────────────────────────────────────────────────────
// In a real app, these would generate PDF/Excel. 
// For now, we'll return JSON that the frontend can convert using libraries.
router.get('/export/daily', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const entries = db.prepare('SELECT * FROM general_diary WHERE date_time LIKE ? ORDER BY date_time ASC')
            .all(`${today}%`);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/gd/suggest-subject ───────────────────────────────────────────
router.post('/suggest-subject', async (req, res) => {
    const { description } = req.body;
    try {
        const result = await suggestGDSubjectAI(description);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/gd/polish-description ──────────────────────────────────────────
router.post('/polish-description', async (req, res) => {
    const { description } = req.body;
    try {
        const result = await polishGDDescriptionAI(description);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Staff Monitoring Routes ──────────────────────────────────────────────────
router.get('/staff', (req, res) => {
    try {
        const staff = db.prepare("SELECT id, full_name, badge_number, rank, role, phone_number, current_duty, duty_location, station_id FROM profiles WHERE status != 'deleted'").all();
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/staff/update', (req, res) => {
    try {
        const { id, full_name, rank, phone_number, current_duty, duty_location, badge_number } = req.body;
        db.prepare(`
            UPDATE profiles 
            SET full_name = ?, rank = ?, phone_number = ?, current_duty = ?, duty_location = ?, badge_number = ? 
            WHERE id = ?
        `).run(full_name, rank, phone_number, current_duty, duty_location, badge_number, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/staff/:id', (req, res) => {
    try {
        const { id } = req.params;
        // Check if entries exist. If yes, soft delete. If no, hard delete.
        const linkedEntries = db.prepare("SELECT count(*) as c FROM general_diary WHERE officer_id = ?").get(id).c;
        if (linkedEntries > 0) {
            db.prepare("UPDATE profiles SET status = 'deleted' WHERE id = ?").run(id);
        } else {
            db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/add-member', (req, res) => {
    try {
        const { full_name, rank, phone_number, badge_number, role, current_duty, duty_location } = req.body;
        console.log("INTERNAL: ADDING MEMBER:", full_name);
        
        const id = `usr-${Date.now()}`;
        const username = `staff_${Date.now()}`;
        
        db.prepare(`
            INSERT INTO profiles (id, username, password, role, full_name, badge_number, rank, station_id, phone_number, current_duty, duty_location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, username, 'password', role || 'constable', full_name, badge_number, rank, 'stn-1', phone_number, current_duty || 'Station Duty', duty_location || 'Police Station');
        
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("ADD MEMBER ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
