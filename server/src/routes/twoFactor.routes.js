const router = require('express').Router();
const ctrl = require('../controllers/twoFactor.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimiters');
const { codeSchema, disable2faSchema } = require('../validators/schemas');

router.use(requireAuth);

router.get('/status', ctrl.status);
router.post('/setup', ctrl.setup);
router.post('/enable', otpLimiter, validate(codeSchema), ctrl.enable);
router.post('/disable', otpLimiter, validate(disable2faSchema), ctrl.disable);
router.post('/backup-codes', otpLimiter, validate(codeSchema), ctrl.regenerateBackupCodes);

module.exports = router;
