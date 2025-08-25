const { getDatabase } = require('../config/database');

const getAllTeams = async (req, res) => {
    try {
        const { search, category, season, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        console.log('Search params:', { search, category, season });

        const db = getDatabase();
        
        let query = `
            SELECT 
                t.*,
                c.name as category_name,
                u.first_name as coach_first_name,
                u.last_name as coach_last_name,
                s.name as season_name,
                COUNT(tp.id) as players_count
            FROM teams t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN users u ON t.coach_id = u.id
            LEFT JOIN seasons s ON t.season_id = s.id
            LEFT JOIN team_players tp ON t.id = tp.team_id AND tp.is_active = 1
            WHERE 1=1
        `;
        const params = [];

        // Search by team name
        if (search && search.trim() !== '') {
            query += ' AND t.name LIKE ?';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm);
        }

        // Filter by category
        if (category && category !== '') {
            query += ' AND t.category_id = ?';
            params.push(parseInt(category));
        }

        // Filter by season
        if (season && season !== '') {
            query += ' AND t.season_id = ?';
            params.push(parseInt(season));
        }

        // Group by team and order
        query += ' GROUP BY t.id ORDER BY t.created_at DESC';
        
        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        console.log('Executing query:', query);
        console.log('With params:', params);
        
        const teams = await db.all(query, params);

        // Transform data to match frontend model
        const transformedTeams = teams.map(team => ({
            ...team,
            coach_name: team.coach_first_name && team.coach_last_name 
                ? `${team.coach_first_name} ${team.coach_last_name}` 
                : null
        }));

        console.log(`Found ${transformedTeams.length} teams`);
        res.json({ teams: transformedTeams });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createTeam = async (req, res) => {
    try {
        const {
            name,
            category_id,
            coach_id,
            season_id,
            primary_color,
            secondary_color,
            formation,
            description
        } = req.body;

        console.log('Creating team with data:', req.body);

        // Validation
        if (!name || !category_id) {
            return res.status(400).json({
                error: 'Required fields: name, category_id'
            });
        }

        const db = getDatabase();

        // Check if team name already exists in the same category and season
        const existingTeam = await db.get(
            'SELECT id FROM teams WHERE name = ? AND category_id = ? AND (season_id = ? OR (season_id IS NULL AND ? IS NULL))',
            [name, category_id, season_id || null, season_id || null]
        );

        if (existingTeam) {
            return res.status(409).json({ 
                error: 'Team name already exists in this category and season' 
            });
        }

        // Insert team
        const result = await db.run(
            `INSERT INTO teams (
                name, category_id, coach_id, season_id, primary_color, 
                secondary_color, formation, description, founded_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                category_id,
                coach_id || null,
                season_id || null,
                primary_color || '#2c5530',
                secondary_color || '#5cb85c',
                formation || '4-4-2',
                description || '',
                new Date().toISOString().split('T')[0]
            ]
        );

        console.log('Team created with ID:', result.lastID);

        res.status(201).json({
            message: 'Team created successfully',
            team: {
                id: result.lastID,
                name,
                category_id
            }
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

const getTeamById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        const team = await db.get(`
            SELECT 
                t.*,
                c.name as category_name,
                u.first_name as coach_first_name,
                u.last_name as coach_last_name,
                s.name as season_name,
                COUNT(tp.id) as players_count
            FROM teams t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN users u ON t.coach_id = u.id
            LEFT JOIN seasons s ON t.season_id = s.id
            LEFT JOIN team_players tp ON t.id = tp.team_id AND tp.is_active = 1
            WHERE t.id = ?
            GROUP BY t.id
        `, [id]);

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Transform data
        const transformedTeam = {
            ...team,
            coach_name: team.coach_first_name && team.coach_last_name 
                ? `${team.coach_first_name} ${team.coach_last_name}` 
                : null
        };

        res.json({ team: transformedTeam });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            category_id,
            coach_id,
            season_id,
            primary_color,
            secondary_color,
            formation,
            description,
            is_active
        } = req.body;

        const db = getDatabase();

        // Check if team exists
        const existingTeam = await db.get('SELECT id FROM teams WHERE id = ?', [id]);
        if (!existingTeam) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Check if team name already exists (excluding current team)
        const duplicateTeam = await db.get(
            'SELECT id FROM teams WHERE name = ? AND category_id = ? AND id != ? AND (season_id = ? OR (season_id IS NULL AND ? IS NULL))',
            [name, category_id, id, season_id || null, season_id || null]
        );

        if (duplicateTeam) {
            return res.status(409).json({ 
                error: 'Team name already exists in this category and season' 
            });
        }

        await db.run(
            `UPDATE teams SET
                name = ?, category_id = ?, coach_id = ?, season_id = ?,
                primary_color = ?, secondary_color = ?, formation = ?, 
                description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                name,
                category_id,
                coach_id || null,
                season_id || null,
                primary_color || '#2c5530',
                secondary_color || '#5cb85c',
                formation || '4-4-2',
                description || '',
                is_active !== undefined ? is_active : 1,
                id
            ]
        );

        res.json({ message: 'Team updated successfully' });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        // Check if team has players
        const teamPlayers = await db.get('SELECT COUNT(*) as count FROM team_players WHERE team_id = ? AND is_active = 1', [id]);
        
        if (teamPlayers.count > 0) {
            return res.status(409).json({ 
                error: 'Cannot delete team with active players. Please remove all players first.' 
            });
        }

        const result = await db.run('DELETE FROM teams WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTeamPlayers = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Getting players for team:', id);
        
        const db = getDatabase();

        // Check if team exists
        const team = await db.get('SELECT id, name FROM teams WHERE id = ?', [id]);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const players = await db.all(`
            SELECT 
                tp.*,
                p.first_name,
                p.last_name,
                p.registration_number,
                p.photo_url,
                p.date_of_birth,
                p.gender,
                p.tshirt_number as player_tshirt_number
            FROM team_players tp
            JOIN players p ON tp.player_id = p.id
            WHERE tp.team_id = ? AND tp.is_active = 1
            ORDER BY tp.is_captain DESC, tp.is_vice_captain DESC, tp.joined_date ASC
        `, [id]);

        // Calculate age and format data
        const transformedPlayers = players.map(player => {
            const birthDate = new Date(player.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            return {
                ...player,
                player_name: `${player.first_name} ${player.last_name}`,
                player_photo: player.photo_url,
                photo_url: player.photo_url, // Add both for compatibility
                player_age: age,
                player_registration_number: player.registration_number
            };
        });

        console.log(`Found ${transformedPlayers.length} players for team ${id}`);
        res.json({ players: transformedPlayers });
    } catch (error) {
        console.error('Get team players error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

const getSeasons = async (req, res) => {
    try {
        const db = getDatabase();
        const seasons = await db.all('SELECT * FROM seasons ORDER BY start_date DESC');
        
        res.json({ seasons });
    } catch (error) {
        console.error('Get seasons error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper function
const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};


const addPlayerToTeam = async (req, res) => {
    try {
        const { id } = req.params; // team_id
        const { player_id, position, jersey_number, is_captain, is_vice_captain } = req.body;

        console.log('Adding player to team:', { team_id: id, player_id, position, jersey_number });

        const db = getDatabase();

        // Validate team exists
        const team = await db.get('SELECT id, category_id FROM teams WHERE id = ?', [id]);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Validate player exists and is in same category
        const player = await db.get('SELECT id, category_id FROM players WHERE id = ?', [player_id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        if (player.category_id !== team.category_id) {
            return res.status(400).json({ error: 'Player must be in the same category as the team' });
        }

        // Check if player is already in this team
        const existingAssignment = await db.get(
            'SELECT id FROM team_players WHERE team_id = ? AND player_id = ? AND is_active = 1',
            [id, player_id]
        );
        if (existingAssignment) {
            return res.status(409).json({ error: 'Player is already in this team' });
        }

        // Check if jersey number is unique within the team
        if (jersey_number) {
            const existingJersey = await db.get(
                'SELECT id FROM team_players WHERE team_id = ? AND jersey_number = ? AND is_active = 1',
                [id, jersey_number]
            );
            if (existingJersey) {
                return res.status(409).json({ error: 'Jersey number already taken in this team' });
            }
        }

        // If setting as captain, remove captain status from other players
        if (is_captain) {
            await db.run(
                'UPDATE team_players SET is_captain = 0 WHERE team_id = ? AND is_active = 1',
                [id]
            );
        }

        // If setting as vice captain, remove vice captain status from other players
        if (is_vice_captain) {
            await db.run(
                'UPDATE team_players SET is_vice_captain = 0 WHERE team_id = ? AND is_active = 1',
                [id]
            );
        }

        // Add player to team
        const result = await db.run(
            `INSERT INTO team_players (
                team_id, player_id, position, jersey_number, 
                is_captain, is_vice_captain, joined_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                player_id,
                position || null,
                jersey_number || null,
                is_captain ? 1 : 0,
                is_vice_captain ? 1 : 0,
                new Date().toISOString().split('T')[0]
            ]
        );

        console.log('Player added to team successfully');
        res.status(201).json({
            message: 'Player added to team successfully',
            assignment_id: result.lastID
        });
    } catch (error) {
        console.error('Add player to team error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};
const testTeamPlayers = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        
        // Simple test query
        const result = await db.all('SELECT * FROM team_players WHERE team_id = ?', [id]);
        res.json({ 
            message: 'Test successful',
            teamId: id,
            rawResults: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const removePlayerFromTeam = async (req, res) => {
    try {
        const { id, playerId } = req.params; // team_id, player_id

        const db = getDatabase();

        // Remove player from team (soft delete)
        const result = await db.run(
            'UPDATE team_players SET is_active = 0, left_date = ? WHERE team_id = ? AND player_id = ? AND is_active = 1',
            [new Date().toISOString().split('T')[0], id, playerId]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Player not found in this team' });
        }

        res.json({ message: 'Player removed from team successfully' });
    } catch (error) {
        console.error('Remove player from team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    getAllTeams,
    createTeam,
    getTeamById,
    updateTeam,
    deleteTeam,
    getTeamPlayers,
    addPlayerToTeam,      
    removePlayerFromTeam, 
    getSeasons,
    testTeamPlayers

};