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
          success: { 
            type: 'boolean', 
            example: true,
            description: 'Indicates if signup was successful'
          },
          message: {
            type: 'string',
            example: 'Account created successfully. Please check your email to verify your account.',
            description: 'Success message with instructions'
          },
          user: {
            type: 'object',
            description: 'User object from Supabase',
            properties: {
              id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
              email: { type: 'string', example: 'user@example.com' },
              email_confirmed_at: { type: 'string', nullable: true, example: null },
              created_at: { type: 'string', example: '2025-12-21T12:00:00Z' },
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
      status: 200,
      description: 'Login successful. Returns session with access token and session ID.',
      schema: {
        type: 'object',
        properties: {
          success: { 
            type: 'boolean', 
            example: true,
            description: 'Login status'
          },
          message: { 
            type: 'string', 
            example: 'You are logged in successfully.',
            description: 'Success message'
          },
          session: {
            type: 'object',
            description: 'Session object containing tokens',
            properties: {
              access_token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImRiK2RXMUJQNVZ6WU9DNkoiLCJ0eXAiOiJKV1QifQ...',
                description: 'JWT access token (expires in ~30 minutes)',
              },
              expires_at: {
                type: 'number',
                example: 1766308296,
                description: 'Unix timestamp when access token expires',
              },
              session_id: {
                type: 'string',
                example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                description: 'Session ID - MUST be sent in X-Session-Id header for all protected requests',
              },
            },
          },
          user: {
            type: 'object',
            description: 'User information',
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
          message: { 
            type: 'string', 
            example: 'Incorrect email or password. Please try again.',
            description: 'Error message'
          },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Forgot password responses
  forgotPassword: {
    success: {
      status: 200,
      description: 'Password reset email sent (if account exists)',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'If an account with this email exists, we have sent a password reset link. Please check your inbox.',
            description: 'Generic success message for security'
          },
        },
      },
    },
    badRequest: {
      status: 400,
      description: 'Bad request - Invalid email format',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid email address' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    },
  },

  // Google login responses
  googleLogin: {
    success: {
      status: 200,
      description: 'Google login successful. Returns session with tokens.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'Logged in successfully with Google.',
          },
          session: {
            type: 'object',
            properties: {
              access_token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImRiK2RXMUJQNVZ6WU9DNkoiLCJ0eXAiOiJKV1QifQ...',
                description: 'JWT access token',
              },
              expires_at: {
                type: 'number',
                example: 1766308296,
                description: 'Unix timestamp when token expires',
              },
              session_id: {
                type: 'string',
                example: 'b2c3d4e5-f6g7-8901-bcde-f01234567891',
                description: 'Session ID for subsequent requests',
              },
            },
          },
        },
        user: {
          type: 'object',
          description: 'User information',
          properties: {
            id: { type: 'string', example: '670e4560-123b-4bea-9953-f336c3e01b0b' },
            email: { type: 'string', example: 'user@example.com' },
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

  // Logout responses
  logout: {
    success: {
      status: 200,
      description: 'Logout successful. Session invalidated.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Logged out successfully.' },
        },
      },
      headers: {
        'x-access-token': {
          description: 'New access token (if token was refreshed during request)',
          schema: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImRiK2RXMUJQNVZ6WU9DNkoiLCJ0eXAiOiJKV1QifQ...' },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Missing or invalid authentication headers',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Missing authentication headers' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Get sessions responses
  sessions: {
    success: {
      status: 200,
      description: 'Active sessions retrieved successfully with device metadata',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          sessions: {
            type: 'array',
            description: 'List of active sessions',
            items: {
              type: 'object',
              properties: {
                session_id: { 
                  type: 'string', 
                  example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                  description: 'Unique session identifier'
                },
                created_at: { 
                  type: 'string', 
                  example: '2025-12-21T12:00:00Z',
                  description: 'When session was created'
                },
                user_agent: { 
                  type: 'string', 
                  example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
                  description: 'Full user-agent string'
                },
                ip_address: { 
                  type: 'string', 
                  example: '192.168.1.100',
                  description: 'Client IP address (proxy-aware)'
                },
                device_type: { 
                  type: 'string', 
                  example: 'Desktop',
                  description: 'Device category (Desktop/Mobile/Tablet)'
                },
                browser: { 
                  type: 'string', 
                  example: 'Chrome 120',
                  description: 'Browser name and version'
                },
                os: { 
                  type: 'string', 
                  example: 'Windows 11',
                  description: 'Operating system and version'
                },
                last_refreshed_at: { 
                  type: 'string', 
                  example: '2025-12-21T13:00:00Z',
                  description: 'When token was last refreshed'
                },
              },
            },
          },
        },
      },
      headers: {
        'x-access-token': {
          description: 'New access token (returned if token was refreshed)',
          schema: { type: 'string' },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Invalid or expired session',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Session expired. Please login again.' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Revoke session responses
  revokeSession: {
    success: {
      status: 200,
      description: 'Session revoked successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Session revoked successfully' },
        },
      },
      headers: {
        'x-access-token': {
          description: 'New access token (if token was refreshed)',
          schema: { type: 'string' },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Invalid authentication',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Missing authentication headers' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
    notFound: {
      status: 404,
      description: 'Session not found or does not belong to user',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Session not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    },
  },

  // Reset password responses
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
      headers: {
        'x-access-token': {
          description: 'New access token if refreshed (rare during reset)',
          schema: { type: 'string' },
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

// Header definitions
export const SwaggerHeaders = {
  authorization: {
    name: 'Authorization',
    description: 'Bearer token (access_token from login)',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6ImRiK2RXMUJQNVZ6WU9DNkoiLCJ0eXAiOiJKV1QifQ...',
  },
  sessionId: {
    name: 'X-Session-Id',
    description: 'Session ID from login response',
    required: true,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },
};
