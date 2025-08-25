const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        const offset = (page - 1) * limit;

        const db = getDatabase();
        let query = `
            SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at
            FROM users 
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const params = [];
        const countParams = [];

        if (role) {
            query += ' AND role = ?';
            countQuery += ' AND role = ?';
            params.push(role);
            countParams.push(role);
        }

        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR email LIKE ?)';
            countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [users, countResult] = await Promise.all([
            db.all(query, params),
            db.get(countQuery, countParams)
        ]);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        const user = await db.get(
            `SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at, updated_at
             FROM users WHERE id = ?`,
            [id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, first_name, last_name, phone, is_active } = req.body;

        const db = getDatabase();

        // Check if user exists
        const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check for duplicate username/email (excluding current user)
        const duplicate = await db.get(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, id]
        );

        if (duplicate) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        await db.run(
            `UPDATE users 
             SET username = ?, email = ?, role = ?, first_name = ?, last_name = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [username, email, role, first_name, last_name, phone, is_active, id]
        );

        const updatedUser = await db.get(
            `SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at, updated_at
             FROM users WHERE id = ?`,
            [id]
        );

        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        // Prevent self-deletion
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await db.run('DELETE FROM users WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        // Get current user status
        const user = await db.get('SELECT id, is_active FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Toggle the status
        const newStatus = user.is_active ? 0 : 1;
        
        await db.run(
            'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, id]
        );

        console.log(`User ${id} status toggled to ${newStatus ? 'active' : 'inactive'}`);

        res.json({ 
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            is_active: newStatus
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    toggleUserStatus
};