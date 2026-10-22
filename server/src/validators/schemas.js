const { z } = require('zod');

const email = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);

const strongPassword = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[a-z]/, 'Password needs a lowercase letter.')
  .regex(/[A-Z]/, 'Password needs an uppercase letter.')
  .regex(/\d/, 'Password needs a number.');

const code = z
  .string({ required_error: 'Verification code is required.' })
  .trim()
  .min(6, 'Enter your 6-digit code or a backup code.')
  .max(20);

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required.' }).trim().min(2, 'Name is too short.').max(80),
  email,
  password: strongPassword,
});

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.').max(128),
  remember: z.boolean().optional().default(false),
});

const codeSchema = z.object({ code });

const disable2faSchema = z.object({
  password: z.string().min(1, 'Password is required.').max(128),
  code,
});

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(80),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.').max(128),
    newPassword: strongPassword,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from the current one.',
    path: ['newPassword'],
  });

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required.').max(128),
  code: z.string().trim().max(20).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  codeSchema,
  disable2faSchema,
  profileSchema,
  changePasswordSchema,
  deleteAccountSchema,
};
