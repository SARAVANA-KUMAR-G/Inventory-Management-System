const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

module.exports = {
  loginSchema
};
