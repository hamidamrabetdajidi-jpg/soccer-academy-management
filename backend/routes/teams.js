const express = require('express');
const {
    getAllTeams,
    createTeam,
    getTeamById,
    updateTeam,
    deleteTeam,
    getTeamPlayers,      // Make sure this is imported
    addPlayerToTeam,
    removePlayerFromTeam
} = require('../controllers/teamController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Debug logging
router.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

router.use(authenticateToken);

// Team routes
router.get('/', getAllTeams);
router.post('/', requireRole(['admin', 'manager']), createTeam);
router.get('/:id', getTeamById);
router.put('/:id', requireRole(['admin', 'manager']), updateTeam);
router.delete('/:id', requireRole(['admin', 'manager']), deleteTeam);

// Team players routes
router.get('/:id/players', getTeamPlayers);  // Make sure this route exists
router.post('/:id/players', requireRole(['admin', 'manager']), addPlayerToTeam);
router.delete('/:id/players/:playerId', requireRole(['admin', 'manager']), removePlayerFromTeam);
router.get('/:id/players/test', (req, res) => {
    res.json({ 
        message: 'Test route works', 
        teamId: req.params.id,
        user: req.user 
    });
});
module.exports = router;