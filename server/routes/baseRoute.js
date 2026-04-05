const express = require('express');
const createController = require('../controllers/baseController');
const auth = require('../middleware/auth');

const createRouter = (Service) => {
    const router = express.Router();
    const controller = createController(Service);

    router.use(auth);

    router.get('/', controller.getAll);
    router.get('/:id', controller.getOne);
    router.post('/', controller.save);
    router.delete('/:id', controller.delete);
    router.post('/bulk', controller.bulkUpdate);
    router.post('/bulk-delete', controller.bulkDelete);

    return router;
};

module.exports = createRouter;
