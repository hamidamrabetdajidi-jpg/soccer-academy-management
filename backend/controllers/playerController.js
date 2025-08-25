const { getDatabase } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/players');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'player-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const getAllPlayers = async (req, res) => {
    try {
        const { search, category, gender, not_in_team, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const db = getDatabase();
        
        let query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.age_min,
                c.age_max
            FROM players p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // Filter players not in any team
        if (not_in_team === 'true') {
            query += ` AND p.id NOT IN (
                SELECT player_id FROM team_players 
                WHERE is_active = 1
            )`;
        }

        if (search && search.trim() !== '') {
            query += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.registration_number LIKE ? OR (p.first_name || " " || p.last_name) LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category && category !== '') {
            query += ' AND p.category_id = ?';
            params.push(parseInt(category));
        }

        if (gender && gender !== '') {
            query += ' AND p.gender = ?';
            params.push(gender);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const players = await db.all(query, params);

        // Transform data to match frontend model
        const transformedPlayers = players.map(player => ({
            ...player,
            photo_url: player.photo_url ? player.photo_url : null,
            address: {
                street: player.street || '',
                city: player.city || '',
                state: player.state || '',
                postal_code: player.postal_code || '',
                country: player.country || ''
            },
            emergency_contact: {
                name: player.emergency_contact_name || '',
                relationship: player.emergency_contact_relationship || '',
                phone: player.emergency_contact_phone || '',
                email: player.emergency_contact_email || ''
            }
        }));

        res.json({ players: transformedPlayers });
    } catch (error) {
        console.error('Get players error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createPlayer = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            date_of_birth,
            gender,
            address,
            phone,
            email,
            category_id,
            tshirt_number,
            medical_info,
            emergency_contact
        } = req.body;

        console.log('Creating player with data:', req.body);

        // Validation
        if (!first_name || !last_name || !date_of_birth || !gender || !category_id) {
            return res.status(400).json({
                error: 'Required fields: first_name, last_name, date_of_birth, gender, category_id'
            });
        }

        const db = getDatabase();

        // Generate UNIQUE registration number with retry logic
        let registrationNumber;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            const year = new Date().getFullYear();
            const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            
            registrationNumber = `SAC${year}${timestamp}${random}`;
            
            // Check if this registration number already exists
            const existing = await db.get(
                'SELECT id FROM players WHERE registration_number = ?',
                [registrationNumber]
            );
            
            if (!existing) {
                break; // Registration number is unique
            }
            
            attempts++;
            console.log(`Registration number ${registrationNumber} already exists, trying again... (attempt ${attempts})`);
            
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            return res.status(500).json({ error: 'Failed to generate unique registration number' });
        }

        console.log('Generated unique registration number:', registrationNumber);

        // Check if t-shirt number is unique within category
        if (tshirt_number) {
            const existing = await db.get(
                'SELECT id FROM players WHERE category_id = ? AND tshirt_number = ? AND is_active = 1',
                [category_id, tshirt_number]
            );
            if (existing) {
                return res.status(409).json({ error: 'T-shirt number already taken in this category' });
            }
        }

        // Insert player
        const result = await db.run(
            `INSERT INTO players (
                registration_number, first_name, last_name, date_of_birth, gender,
                street, city, state, postal_code, country,
                phone, email, category_id, tshirt_number, medical_info,
                emergency_contact_name, emergency_contact_relationship, 
                emergency_contact_phone, emergency_contact_email,
                registration_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                registrationNumber, 
                first_name, 
                last_name, 
                date_of_birth, 
                gender,
                address?.street || '', 
                address?.city || '', 
                address?.state || '', 
                address?.postal_code || '', 
                address?.country || 'Morocco',
                phone || '', 
                email || '', 
                category_id, 
                tshirt_number || null, 
                medical_info || '',
                emergency_contact?.name || '', 
                emergency_contact?.relationship || '',
                emergency_contact?.phone || '', 
                emergency_contact?.email || '',
                new Date().toISOString().split('T')[0]
            ]
        );

        console.log('Player created with ID:', result.lastID);

        res.status(201).json({
            message: 'Player registered successfully',
            player: {
                id: result.lastID,
                registration_number: registrationNumber,
                first_name,
                last_name
            }
        });
    } catch (error) {
        console.error('Create player error:', error);
        
        // Handle specific constraint errors
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            if (error.message.includes('registration_number')) {
                return res.status(409).json({ error: 'Registration number already exists. Please try again.' });
            }
            if (error.message.includes('tshirt_number')) {
                return res.status(409).json({ error: 'T-shirt number already taken in this category.' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

const getPlayerById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        const player = await db.get(`
            SELECT 
                p.*,
                c.name as category_name,
                c.age_min,
                c.age_max
            FROM players p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Transform data
        const transformedPlayer = {
            ...player,
            address: {
                street: player.street || '',
                city: player.city || '',
                state: player.state || '',
                postal_code: player.postal_code || '',
                country: player.country || ''
            },
            emergency_contact: {
                name: player.emergency_contact_name || '',
                relationship: player.emergency_contact_relationship || '',
                phone: player.emergency_contact_phone || '',
                email: player.emergency_contact_email || ''
            }
        };

        res.json({ player: transformedPlayer });
    } catch (error) {
        console.error('Get player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name,
            last_name,
            date_of_birth,
            gender,
            address,
            phone,
            email,
            category_id,
            tshirt_number,
            medical_info,
            emergency_contact,
            is_active
        } = req.body;

        const db = getDatabase();

        // Check if player exists
        const existingPlayer = await db.get('SELECT id FROM players WHERE id = ?', [id]);
        if (!existingPlayer) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Check t-shirt number uniqueness if changed
        if (tshirt_number) {
            const existing = await db.get(
                'SELECT id FROM players WHERE category_id = ? AND tshirt_number = ? AND id != ? AND is_active = 1',
                [category_id, tshirt_number, id]
            );
            if (existing) {
                return res.status(409).json({ error: 'T-shirt number already taken in this category' });
            }
        }

        await db.run(
            `UPDATE players SET
                first_name = ?, last_name = ?, date_of_birth = ?, gender = ?,
                street = ?, city = ?, state = ?, postal_code = ?, country = ?,
                phone = ?, email = ?, category_id = ?, tshirt_number = ?, medical_info = ?,
                emergency_contact_name = ?, emergency_contact_relationship = ?,
                emergency_contact_phone = ?, emergency_contact_email = ?,
                is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                first_name, last_name, date_of_birth, gender,
                address?.street || '', address?.city || '', address?.state || '', 
                address?.postal_code || '', address?.country || '',
                phone || '', email || '', category_id, tshirt_number || null, medical_info || '',
                emergency_contact?.name || '', emergency_contact?.relationship || '',
                emergency_contact?.phone || '', emergency_contact?.email || '',
                is_active !== undefined ? is_active : 1,
                id
            ]
        );

        res.json({ message: 'Player updated successfully' });
    } catch (error) {
        console.error('Update player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const deletePlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        // Get player info to delete photo if exists
        const player = await db.get('SELECT photo_url FROM players WHERE id = ?', [id]);
        
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Delete photo file if exists
        if (player.photo_url) {
            const photoPath = path.join(__dirname, '../uploads/players', path.basename(player.photo_url));
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
                console.log('Deleted player photo:', photoPath);
            }
        }

        // Delete player from database
        const result = await db.run('DELETE FROM players WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        console.log('Player deleted successfully:', id);
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Delete player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const uploadPlayerPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        // Check if player exists
        const player = await db.get('SELECT id, photo_url FROM players WHERE id = ?', [id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Delete old photo if exists
        if (player.photo_url) {
            const oldPhotoPath = path.join(__dirname, '../uploads/players', path.basename(player.photo_url));
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Update player with new photo URL
        const photoUrl = `/uploads/players/${req.file.filename}`;
        await db.run('UPDATE players SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [photoUrl, id]);

        res.json({
            message: 'Photo uploaded successfully',
            photo_url: photoUrl
        });
    } catch (error) {
        console.error('Upload photo error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCategories = async (req, res) => {
    try {
        const db = getDatabase();
        const categories = await db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY age_min');
        
        res.json({ categories: categories || [] });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllPlayers,
    createPlayer,
    getPlayerById,
    updatePlayer,
    deletePlayer,
    uploadPlayerPhoto,
    getCategories,
    upload
};