const router = require('express').Router();
const ctrl = require('../controllers/session.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.delete('/', ctrl.revokeOthers);
router.delete('/:id', ctrl.revoke);

module.exports = router;
