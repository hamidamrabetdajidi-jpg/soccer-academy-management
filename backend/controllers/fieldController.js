const { getDatabase } = require('../config/database');

const getAllFields = async (req, res) => {
    try {
        const { 
            search,
            field_type,
            surface_type,
            location,
            is_indoor,
            has_lighting,
            has_parking,
            has_changing_rooms,
            min_capacity,
            max_capacity,
            min_rate,
            max_rate,
            availability_status,
            sort_by = 'name',
            sort_order = 'asc',
            page = 1,
            limit = 50
        } = req.query;
        
        console.log('🔍 Advanced search params:', req.query);
        
        const db = getDatabase();
        
        // Build dynamic query
        let query = `
            SELECT 
                f.*,
                COUNT(fb.id) as total_bookings,
                CASE 
                    WHEN COUNT(CASE WHEN fb.booking_date = date('now') AND fb.status = 'confirmed' THEN 1 END) > 0 
                    THEN 'occupied'
                    WHEN f.maintenance_notes IS NOT NULL AND f.maintenance_notes != ''
                    THEN 'maintenance'
                    ELSE 'available'
                END as availability_status
            FROM fields f
            LEFT JOIN field_bookings fb ON f.id = fb.field_id
            WHERE f.is_active = 1
        `;
        
        const params = [];
        
        // Search functionality - search in name, description, location, address
        if (search && search.trim() !== '') {
            query += ` AND (
                f.name LIKE ? OR 
                f.description LIKE ? OR 
                f.location LIKE ? OR 
                f.address LIKE ? OR
                f.facilities LIKE ?
            )`;
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        // Field type filter
        if (field_type && field_type !== '') {
            query += ' AND f.field_type = ?';
            params.push(field_type);
        }
        
        // Surface type filter
        if (surface_type && surface_type !== '') {
            query += ' AND f.surface_type = ?';
            params.push(surface_type);
        }
        
        // Location filter
        if (location && location !== '') {
            query += ' AND f.location LIKE ?';
            params.push(`%${location}%`);
        }
        
        // Indoor/outdoor filter
        if (is_indoor !== undefined && is_indoor !== '') {
            query += ' AND f.is_indoor = ?';
            params.push(is_indoor === 'true' ? 1 : 0);
        }
        
        // Lighting filter
        if (has_lighting !== undefined && has_lighting !== '') {
            query += ' AND f.has_lighting = ?';
            params.push(has_lighting === 'true' ? 1 : 0);
        }
        
        // Parking filter
        if (has_parking !== undefined && has_parking !== '') {
            query += ' AND f.has_parking = ?';
            params.push(has_parking === 'true' ? 1 : 0);
        }
        
        // Changing rooms filter
        if (has_changing_rooms !== undefined && has_changing_rooms !== '') {
            query += ' AND f.has_changing_rooms = ?';
            params.push(has_changing_rooms === 'true' ? 1 : 0);
        }
        
        // Capacity range filter
        if (min_capacity && min_capacity !== '') {
            query += ' AND f.capacity >= ?';
            params.push(parseInt(min_capacity));
        }
        
        if (max_capacity && max_capacity !== '') {
            query += ' AND f.capacity <= ?';
            params.push(parseInt(max_capacity));
        }
        
        // Rate range filter
        if (min_rate && min_rate !== '') {
            query += ' AND f.hourly_rate >= ?';
            params.push(parseFloat(min_rate));
        }
        
        if (max_rate && max_rate !== '') {
            query += ' AND f.hourly_rate <= ?';
            params.push(parseFloat(max_rate));
        }
        
        // Group by for the aggregate functions
        query += ' GROUP BY f.id';
        
        // Availability status filter (after GROUP BY)
        if (availability_status && availability_status !== '') {
            query += ` HAVING availability_status = ?`;
            params.push(availability_status);
        }
        
        // Sorting
        const allowedSortFields = ['name', 'field_type', 'surface_type', 'capacity', 'location', 'hourly_rate', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'name';
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY f.${sortField} ${sortDirection}`;
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        console.log('📊 Executing query with', params.length, 'parameters');
        
        const fields = await db.all(query, params);
        
        // Get total count for pagination (without LIMIT)
        let countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT f.id) as total FROM');
        countQuery = countQuery.replace(/ORDER BY[\s\S]*/, '');
        countQuery = countQuery.replace(/LIMIT[\s\S]*/, '');
        
        const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
        const totalResult = await db.get(countQuery, countParams);
        const total = totalResult?.total || 0;
        
        // Get statistics
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_fields,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_fields,
                COUNT(CASE WHEN is_indoor = 1 AND is_active = 1 THEN 1 END) as indoor_fields,
                COUNT(CASE WHEN is_indoor = 0 AND is_active = 1 THEN 1 END) as outdoor_fields,
                SUM(CASE WHEN is_active = 1 THEN capacity ELSE 0 END) as total_capacity,
                AVG(CASE WHEN is_active = 1 AND hourly_rate > 0 THEN hourly_rate END) as avg_hourly_rate
            FROM fields
        `);
        
        // Get unique values for filter dropdowns
        const filterOptions = await db.all(`
            SELECT DISTINCT 
                field_type,
                surface_type,
                location
            FROM fields 
            WHERE is_active = 1 AND location IS NOT NULL AND location != ''
            ORDER BY location
        `);
        
        console.log(`📊 Found ${fields.length} fields (${total} total)`);
        
        res.json({ 
            fields,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filter_options: {
                locations: [...new Set(filterOptions.map(f => f.location).filter(Boolean))],
                field_types: [...new Set(filterOptions.map(f => f.field_type))],
                surface_types: [...new Set(filterOptions.map(f => f.surface_type))]
            }
        });
        
    } catch (error) {
        console.error('❌ Get fields error:', error);
        res.status(500).json({ error: 'Failed to get fields: ' + error.message });
    }
};
const getFieldById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        
        const field = await db.get(`
            SELECT 
                f.*,
                COUNT(fb.id) as total_bookings
            FROM fields f
            LEFT JOIN field_bookings fb ON f.id = fb.field_id
            WHERE f.id = ? AND f.is_active = 1
            GROUP BY f.id
        `, [id]);
        
        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }
        
        // Get recent bookings
        const recentBookings = await db.all(`
            SELECT 
                fb.*,
                u.first_name || ' ' || u.last_name as booked_by_name,
                ts.title as session_title
            FROM field_bookings fb
            LEFT JOIN users u ON fb.booked_by_user_id = u.id
            LEFT JOIN training_sessions ts ON fb.session_id = ts.id
            WHERE fb.field_id = ?
            ORDER BY fb.booking_date DESC, fb.start_time DESC
            LIMIT 10
        `, [id]);
        
        // Get upcoming maintenance
        const upcomingMaintenance = await db.all(`
            SELECT 
                fm.*,
                u.first_name || ' ' || u.last_name as created_by_name
            FROM field_maintenance fm
            LEFT JOIN users u ON fm.created_by_user_id = u.id
            WHERE fm.field_id = ? AND fm.scheduled_date >= date('now')
            ORDER BY fm.scheduled_date ASC, fm.start_time ASC
            LIMIT 5
        `, [id]);
        
        res.json({ 
            field,
            recent_bookings: recentBookings,
            upcoming_maintenance: upcomingMaintenance
        });
        
    } catch (error) {
        console.error('❌ Get field error:', error);
        res.status(500).json({ error: 'Failed to get field: ' + error.message });
    }
};

const createField = async (req, res) => {
    try {
        const {
            name, description, field_type, surface_type, dimensions, capacity,
            location, address, facilities, equipment_available, hourly_rate,
            is_indoor, has_lighting, has_parking, has_changing_rooms, maintenance_notes
        } = req.body;
        
        console.log('🏟️ Creating field:', req.body);
        
        // Validation
        if (!name || !field_type || !capacity) {
            return res.status(400).json({
                error: 'Required fields: name, field_type, capacity'
            });
        }
        
        const db = getDatabase();
        
        const result = await db.run(`
            INSERT INTO fields (
                name, description, field_type, surface_type, dimensions, capacity,
                location, address, facilities, equipment_available, hourly_rate,
                is_indoor, has_lighting, has_parking, has_changing_rooms, maintenance_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            description || '',
            field_type,
            surface_type || 'natural_grass',
            dimensions || '',
            parseInt(capacity),
            location || '',
            address || '',
            facilities || '',
            equipment_available || '',
            parseFloat(hourly_rate) || 0.00,
            is_indoor ? 1 : 0,
            has_lighting ? 1 : 0,
            has_parking ? 1 : 0,
            has_changing_rooms ? 1 : 0,
            maintenance_notes || ''
        ]);
        
        console.log('✅ Field created with ID:', result.lastID);
        res.status(201).json({ 
            message: 'Field created successfully', 
            id: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Create field error:', error);
        res.status(500).json({ error: 'Failed to create field: ' + error.message });
    }
};

const updateField = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, field_type, surface_type, dimensions, capacity,
            location, address, facilities, equipment_available, hourly_rate,
            is_indoor, has_lighting, has_parking, has_changing_rooms, maintenance_notes
        } = req.body;
        
        console.log('🔄 Updating field:', id);
        console.log('📝 Update data:', req.body);
        
        // Validation
        if (!name || !field_type || !capacity) {
            return res.status(400).json({
                error: 'Required fields: name, field_type, capacity'
            });
        }
        
        const db = getDatabase();
        
        // Check if field exists
        const existingField = await db.get('SELECT id FROM fields WHERE id = ? AND is_active = 1', [id]);
        if (!existingField) {
            return res.status(404).json({ error: 'Field not found' });
        }
        
        const result = await db.run(`
            UPDATE fields SET
                name = ?, 
                description = ?, 
                field_type = ?, 
                surface_type = ?, 
                dimensions = ?, 
                capacity = ?, 
                location = ?, 
                address = ?,
                facilities = ?, 
                equipment_available = ?, 
                hourly_rate = ?,
                is_indoor = ?, 
                has_lighting = ?, 
                has_parking = ?, 
                has_changing_rooms = ?,
                maintenance_notes = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND is_active = 1
        `, [
            name,
            description || '',
            field_type,
            surface_type || 'natural_grass',
            dimensions || '',
            parseInt(capacity) || 22,
            location || '',
            address || '',
            facilities || '',
            equipment_available || '',
            parseFloat(hourly_rate) || 0.00,
            is_indoor ? 1 : 0,
            has_lighting ? 1 : 0,
            has_parking ? 1 : 0,
            has_changing_rooms ? 1 : 0,
            maintenance_notes || '',
            id
        ]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Field not found or no changes made' });
        }
        
        console.log('✅ Field updated successfully, changes:', result.changes);
        res.json({ 
            message: 'Field updated successfully',
            updated_id: id,
            changes: result.changes
        });
        
    } catch (error) {
        console.error('❌ Update field error:', error);
        res.status(500).json({ error: 'Failed to update field: ' + error.message });
    }
};

const deleteField = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ SIMPLE DELETE - Field ID:', id);
        
        const db = getDatabase();
        
        // Very simple: just check if field exists and delete it
        const field = await db.get('SELECT id, name, is_active FROM fields WHERE id = ?', [id]);
        console.log('🔍 Found field:', field);
        
        if (!field) {
            console.log('❌ Field not found');
            return res.status(404).json({ 
                error: 'Field not found',
                id: id
            });
        }
        
        // Simple soft delete
        const result = await db.run('UPDATE fields SET is_active = 0 WHERE id = ?', [id]);
        console.log('📝 Update result:', result);
        
        if (result.changes === 0) {
            console.log('❌ No rows updated');
            return res.status(400).json({ error: 'No rows were updated' });
        }
        
        console.log('✅ Field deleted successfully');
        res.json({ 
            message: 'Field deleted successfully',
            deleted_id: id,
            changes: result.changes
        });
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ 
            error: 'Delete failed: ' + error.message,
            stack: error.stack
        });
    }
};
module.exports = {
    getAllFields,
    getFieldById,
    createField,
    updateField,
    deleteField
};