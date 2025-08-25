const { getDatabase } = require('../config/database');

const getAllValuations = async (req, res) => {
    try {
        const { 
            search, 
            position, 
            rating_range, 
            sort_by = 'overall_rating', 
            sort_order = 'desc',
            player_id,
            page = 1,
            limit = 50 
        } = req.query;
        
        const offset = (page - 1) * limit;
        const db = getDatabase();
        
        let query = `
            SELECT 
                v.*,
                p.first_name || ' ' || p.last_name as player_name,
                p.registration_number,
                p.date_of_birth,
                p.photo_url as player_photo,
                u.first_name || ' ' || u.last_name as evaluator_name,
                c.name as category_name
            FROM player_valuations v
            JOIN players p ON v.player_id = p.id
            LEFT JOIN users u ON v.evaluator_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE v.is_active = 1
        `;
        
        const params = [];
        
        // Filter by specific player
        if (player_id) {
            query += ' AND v.player_id = ?';
            params.push(parseInt(player_id));
        }
        
        // Search by player name
        if (search && search.trim() !== '') {
            query += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.registration_number LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Filter by rating range
        if (rating_range && rating_range !== '') {
            const [min, max] = rating_range.split('-').map(Number);
            query += ' AND v.overall_rating BETWEEN ? AND ?';
            params.push(min, max);
        }
        
        // Add sorting
        const allowedSortFields = ['overall_rating', 'potential_rating', 'evaluation_date', 'player_name', 'technical_skills'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'overall_rating';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        
        if (sortField === 'player_name') {
            query += ` ORDER BY p.first_name ${sortDirection}, p.last_name ${sortDirection}`;
        } else {
            query += ` ORDER BY v.${sortField} ${sortDirection}`;
        }
        
        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('Executing valuation query:', query);
        console.log('With params:', params);
        
        const valuations = await db.all(query, params);
        
        // Get summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_valuations,
                AVG(overall_rating) as avg_rating,
                MAX(overall_rating) as max_rating,
                MIN(overall_rating) as min_rating
            FROM player_valuations v
            JOIN players p ON v.player_id = p.id
            WHERE v.is_active = 1
        `;
        
        const summary = await db.get(summaryQuery);
        
        console.log(`Found ${valuations.length} valuations`);
        res.json({ 
            valuations,
            summary: {
                total: summary.total_valuations,
                average_rating: Math.round(summary.avg_rating * 10) / 10,
                highest_rating: summary.max_rating,
                lowest_rating: summary.min_rating
            }
        });
    } catch (error) {
        console.error('Get valuations error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

const getValuationById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        
        const valuation = await db.get(`
            SELECT 
                v.*,
                p.first_name || ' ' || p.last_name as player_name,
                p.registration_number,
                p.date_of_birth,
                p.photo_url as player_photo,
                u.first_name || ' ' || u.last_name as evaluator_name,
                c.name as category_name
            FROM player_valuations v
            JOIN players p ON v.player_id = p.id
            LEFT JOIN users u ON v.evaluator_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE v.id = ? AND v.is_active = 1
        `, [id]);
        
        if (!valuation) {
            return res.status(404).json({ error: 'Valuation not found' });
        }
        
        res.json({ valuation });
    } catch (error) {
        console.error('Get valuation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createValuation = async (req, res) => {
    try {
        const {
            player_id, 
            evaluation_date, 
            season_id,
            matches_played, 
            goals_scored, 
            assists,
            yellow_cards, 
            red_cards, 
            minutes_played, 
            technical_skills,
            physical_skills, 
            mental_skills, 
            tactical_skills, 
            attacking_rating,
            defending_rating, 
            goalkeeping_rating, 
            overall_rating, 
            potential_rating,
            market_value, 
            strengths, 
            weaknesses, 
            development_notes, 
            recommended_training
        } = req.body;
        
        console.log('Creating valuation:', req.body);
        
        // Validation
        if (!player_id || !evaluation_date || !technical_skills || !physical_skills || !mental_skills || !tactical_skills || !potential_rating) {
            return res.status(400).json({
                error: 'Required fields: player_id, evaluation_date, all skill ratings, potential_rating'
            });
        }
        
        const db = getDatabase();
        const evaluator_id = req.user.id;
        
        // Check if player exists
        const player = await db.get('SELECT id FROM players WHERE id = ?', [player_id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Calculate overall rating if not provided
        const calculatedOverallRating = overall_rating || Math.round(
            ((technical_skills + physical_skills + mental_skills + tactical_skills) / 4) * 10
        ) / 10;
        
        const result = await db.run(`
            INSERT INTO player_valuations (
                player_id, evaluator_id, evaluation_date, season_id, matches_played, goals_scored,
                assists, yellow_cards, red_cards, minutes_played, technical_skills,
                physical_skills, mental_skills, tactical_skills, attacking_rating,
                defending_rating, goalkeeping_rating, overall_rating, potential_rating,
                market_value, strengths, weaknesses, development_notes, recommended_training
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            player_id, 
            evaluator_id, 
            evaluation_date, 
            season_id || null,
            matches_played || 0, 
            goals_scored || 0,
            assists || 0, 
            yellow_cards || 0, 
            red_cards || 0, 
            minutes_played || 0,
            technical_skills, 
            physical_skills, 
            mental_skills, 
            tactical_skills,
            attacking_rating || null, 
            defending_rating || null, 
            goalkeeping_rating || null, 
            calculatedOverallRating,
            potential_rating, 
            market_value || null, 
            strengths || '', 
            weaknesses || '', 
            development_notes || '', 
            recommended_training || ''
        ]);
        
        console.log('Valuation created with ID:', result.lastID);
        
        res.status(201).json({ 
            message: 'Player valuation created successfully', 
            id: result.lastID,
            overall_rating: calculatedOverallRating
        });
    } catch (error) {
        console.error('Create valuation error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

const updateValuation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            evaluation_date, 
            matches_played, 
            goals_scored, 
            assists,
            yellow_cards, 
            red_cards, 
            minutes_played, 
            technical_skills,
            physical_skills, 
            mental_skills, 
            tactical_skills, 
            attacking_rating,
            defending_rating, 
            goalkeeping_rating, 
            potential_rating,
            market_value, 
            strengths, 
            weaknesses, 
            development_notes, 
            recommended_training
        } = req.body;
        
        const db = getDatabase();
        
        // Check if valuation exists and user has permission
        const existingValuation = await db.get(
            'SELECT id, evaluator_id FROM player_valuations WHERE id = ? AND is_active = 1', 
            [id]
        );
        
        if (!existingValuation) {
            return res.status(404).json({ error: 'Valuation not found' });
        }
        
        // Only allow the original evaluator or admin to update
        if (existingValuation.evaluator_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only edit your own evaluations' });
        }
        
        // Calculate overall rating
        const overall_rating = Math.round(
            ((technical_skills + physical_skills + mental_skills + tactical_skills) / 4) * 10
        ) / 10;
        
        await db.run(`
            UPDATE player_valuations SET
                evaluation_date = ?, matches_played = ?, goals_scored = ?, assists = ?,
                yellow_cards = ?, red_cards = ?, minutes_played = ?, technical_skills = ?,
                physical_skills = ?, mental_skills = ?, tactical_skills = ?, attacking_rating = ?,
                defending_rating = ?, goalkeeping_rating = ?, overall_rating = ?, potential_rating = ?,
                market_value = ?, strengths = ?, weaknesses = ?, development_notes = ?, 
                recommended_training = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            evaluation_date, matches_played || 0, goals_scored || 0, assists || 0,
            yellow_cards || 0, red_cards || 0, minutes_played || 0, technical_skills,
            physical_skills, mental_skills, tactical_skills, attacking_rating || null,
            defending_rating || null, goalkeeping_rating || null, overall_rating, potential_rating,
            market_value || null, strengths || '', weaknesses || '', development_notes || '', 
            recommended_training || '', id
        ]);
        
        res.json({ 
            message: 'Valuation updated successfully',
            overall_rating
        });
    } catch (error) {
        console.error('Update valuation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteValuation = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        
        // Check if valuation exists and user has permission
        const existingValuation = await db.get(
            'SELECT id, evaluator_id FROM player_valuations WHERE id = ? AND is_active = 1', 
            [id]
        );
        
        if (!existingValuation) {
            return res.status(404).json({ error: 'Valuation not found' });
        }
        
        // Only allow the original evaluator or admin to delete
        if (existingValuation.evaluator_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own evaluations' });
        }
        
        // Soft delete
        await db.run(
            'UPDATE player_valuations SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [id]
        );
        
        res.json({ message: 'Valuation deleted successfully' });
    } catch (error) {
        console.error('Delete valuation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPlayerValuationHistory = async (req, res) => {
    try {
        const { playerId } = req.params;
        const db = getDatabase();
        
        const valuations = await db.all(`
            SELECT 
                v.*,
                u.first_name || ' ' || u.last_name as evaluator_name
            FROM player_valuations v
            LEFT JOIN users u ON v.evaluator_id = u.id
            WHERE v.player_id = ? AND v.is_active = 1
            ORDER BY v.evaluation_date DESC
        `, [playerId]);
        
        // Calculate trends
        const trends = {};
        if (valuations.length > 1) {
            const latest = valuations[0];
            const previous = valuations[1];
            
            trends.overall = latest.overall_rating - previous.overall_rating;
            trends.technical = latest.technical_skills - previous.technical_skills;
            trends.physical = latest.physical_skills - previous.physical_skills;
            trends.mental = latest.mental_skills - previous.mental_skills;
            trends.tactical = latest.tactical_skills - previous.tactical_skills;
        }
        
        res.json({ valuations, trends });
    } catch (error) {
        console.error('Get player valuation history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getValuationStats = async (req, res) => {
    try {
        const db = getDatabase();
        
        // Overall statistics
        const overallStats = await db.get(`
            SELECT 
                COUNT(*) as total_evaluations,
                COUNT(DISTINCT player_id) as players_evaluated,
                AVG(overall_rating) as avg_overall_rating,
                AVG(potential_rating) as avg_potential_rating,
                MAX(overall_rating) as highest_rating,
                MIN(overall_rating) as lowest_rating
            FROM player_valuations 
            WHERE is_active = 1
        `);
        
        // Rating distribution
        const ratingDistribution = await db.all(`
            SELECT 
                CASE 
                    WHEN overall_rating >= 9 THEN 'Excellent (9-10)'
                    WHEN overall_rating >= 7 THEN 'Good (7-8.9)'
                    WHEN overall_rating >= 5 THEN 'Average (5-6.9)'
                    ELSE 'Below Average (1-4.9)'
                END as rating_category,
                COUNT(*) as count
            FROM player_valuations 
            WHERE is_active = 1
            GROUP BY rating_category
            ORDER BY MIN(overall_rating) DESC
        `);
        
        // Recent evaluations
        const recentEvaluations = await db.all(`
            SELECT 
                v.evaluation_date,
                p.first_name || ' ' || p.last_name as player_name,
                v.overall_rating,
                u.first_name || ' ' || u.last_name as evaluator_name
            FROM player_valuations v
            JOIN players p ON v.player_id = p.id
            LEFT JOIN users u ON v.evaluator_id = u.id
            WHERE v.is_active = 1
            ORDER BY v.evaluation_date DESC
            LIMIT 10
        `);
        
        res.json({
            overall: overallStats,
            distribution: ratingDistribution,
            recent: recentEvaluations
        });
    } catch (error) {
        console.error('Get valuation stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllValuations,
    getValuationById,
    createValuation,
    updateValuation,
    deleteValuation,
    getPlayerValuationHistory,
    getValuationStats
};