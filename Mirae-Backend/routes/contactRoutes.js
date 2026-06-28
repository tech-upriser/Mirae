const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getContacts, getContactById, updateContact } = require('../controllers/contactController');

router.get('/', protect, getContacts);
router.get('/:id', protect, getContactById);
router.put('/:id', protect, updateContact);

module.exports = router;
