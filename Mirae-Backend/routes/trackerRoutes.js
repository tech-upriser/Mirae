const express = require('express');
const router = express.Router();
const trackerController = require('../controllers/trackerController');

const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, trackerController.createJob);
router.get('/', protect, trackerController.getAllJobs);
router.delete('/:id', protect, trackerController.deleteJob);
router.put('/:id/status', protect, trackerController.updateJobStatus);
router.put('/:id/contacts', protect, trackerController.updateJobContacts);
router.put('/:id/notes', protect, trackerController.updateJobNotes);

module.exports = router;
