const router = require('express').Router();
const ctrl = require('../controllers/account.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { profileSchema, changePasswordSchema, deleteAccountSchema } = require('../validators/schemas');

router.use(requireAuth);

router.get('/activity', ctrl.activity);
router.patch('/profile', validate(profileSchema), ctrl.updateProfile);
router.post('/password', authLimiter, validate(changePasswordSchema), ctrl.changePassword);
router.delete('/', authLimiter, validate(deleteAccountSchema), ctrl.deleteAccount);

module.exports = router;
