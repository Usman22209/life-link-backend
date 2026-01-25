// Swagger response schemas for authentication endpoints
export const SwaggerResponses = {
  // Signup responses
  signup: {
    success: {
      status: 201,
      description: 'Account created successfully. Verification email sent.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Account created successfully. Please check your email to verify your account.' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
              email: { type: 'string', example: 'user@example.com' },
            }
          },
        },
      },
    },
    badRequest: {
      status: 400,
      description: 'Bad request - Invalid input or user already exists',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'We could not create your account. Please try again later.' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    },
  },

  // Login responses
  login: {
    success: {
      status: 201,
      description: 'Login successful. Returns access_token and refresh_token.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'You are logged in successfully.' },
          session: {
            type: 'object',
            properties: {
              access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
              refresh_token: { type: 'string', example: 'v1.refresh_token...' },
              expires_at: { type: 'number', example: 1766308296 },
            },
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
              email: { type: 'string', example: 'user@example.com' },
            },
          },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Invalid credentials or email not verified',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Incorrect email or password. Please try again.' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Forgot password
  forgotPassword: {
    success: {
      status: 201,
      description: 'Password reset email sent (if account exists)',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'If an account with this email exists, we have sent a password reset link.' },
        },
      },
    },
  },

  // Google login
  googleLogin: {
    success: {
      status: 201,
      description: 'Google login successful.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Logged in successfully with Google.' },
          session: {
            type: 'object',
            properties: {
              access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
              refresh_token: { type: 'string', example: 'v1.refresh_token...' },
              expires_at: { type: 'number', example: 1766308296 },
            },
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
              email: { type: 'string', example: 'user@example.com' },
            },
          },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Invalid Google ID token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Google login failed.' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Refresh token
  refresh: {
    success: {
      status: 201,
      description: 'Token refreshed successfully.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Token refreshed successfully.' },
          session: {
            type: 'object',
            properties: {
              access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
              refresh_token: { type: 'string', example: 'v1.refresh_token...' },
              expires_at: { type: 'number', example: 1766308296 },
            },
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
              email: { type: 'string', example: 'user@example.com' },
            },
          },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Invalid or expired refresh token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid or expired refresh token.' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Logout
  logout: {
    success: {
      status: 201,
      description: 'Logout successful.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Logged out successfully.' },
        },
      },
    },
  },

  // Reset password
  resetPassword: {
    success: {
      status: 200,
      description: 'Password has been reset successfully.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Password has been reset successfully.' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
              email: { type: 'string', example: 'user@example.com' },
            },
          },
        },
      },
    },
    badRequest: {
      status: 400,
      description: 'Bad request - Link expired or invalid password',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Failed to reset password. Link may be expired.' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    },
  },
};
