const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    toggleUserStatus 
} = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', requireRole(['admin']), updateUser);
router.delete('/:id', requireRole(['admin']), deleteUser);
router.patch('/:id/toggle-status', requireRole(['admin']), toggleUserStatus);  // Add this line

module.exports = router;