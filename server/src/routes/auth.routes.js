const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiters');
const { registerSchema, loginSchema, codeSchema } = require('../validators/schemas');

router.get('/csrf', ctrl.csrf);
router.get('/session', ctrl.session);

router.post('/register', authLimiter, requireGuest, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);

router.post('/2fa/verify', otpLimiter, validate(codeSchema), ctrl.verifyMfa);
router.post('/2fa/cancel', ctrl.cancelMfa);

router.get('/me', requireAuth, ctrl.me);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;
