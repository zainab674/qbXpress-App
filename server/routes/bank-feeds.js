const express = require('express');
const createRouter = require('./baseRoute');
const service = require('../services/bankFeedService');
const controller = require('../controllers/bankImportController');
const auth = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const router = createRouter(service);

// Custom routes
router.post('/upload', auth, upload.single('file'), controller.uploadPreview);
router.post('/process', auth, controller.processImport);
router.post('/categorize', auth, controller.categorize);
router.post('/delete-all-excluded', auth, controller.deleteAllExcluded);
router.post('/:id/attachments', auth, upload.single('attachment'), controller.uploadAttachment);
router.delete('/:id/attachments', auth, controller.deleteAttachment);

module.exports = router;
