// Swagger response schemas for file endpoints
export const SwaggerResponses = {
  // Upload file responses
  upload: {
    success: {
      status: 201,
      description: 'File uploaded successfully to Cloudinary.',
      schema: {
        type: 'object',
        properties: {
          success: { 
            type: 'boolean', 
            example: true,
            description: 'Upload status'
          },
          url: {
            type: 'string',
            example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/user_uploads/abc123.jpg',
            description: 'Cloudinary secure URL of uploaded file'
          },
          publicId: { 
            type: 'string', 
            example: 'user_uploads/abc123',
            description: 'Cloudinary public ID (used for deletion)'
          },
        },
      },
      headers: {
        'x-access-token': {
          description: 'New access token (if token was refreshed during upload)',
          schema: { type: 'string' },
        },
      },
    },
    badRequest: {
      status: 400,
      description: 'Bad request - Invalid file or upload failed',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { 
            type: 'string', 
            example: 'Upload failed',
            description: 'Error message'
          },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Missing or invalid authentication',
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

  // Delete file responses
  delete: {
    success: {
      status: 200,
      description: 'File deleted successfully from Cloudinary.',
      schema: {
        type: 'object',
        properties: {
          success: { 
            type: 'boolean', 
            example: true,
            description: 'Deletion status'
          },
          message: { 
            type: 'string', 
            example: 'File deleted successfully',
            description: 'Success message'
          },
          result: { 
            type: 'object',
            description: 'Cloudinary delete result',
            properties: {
              result: { type: 'string', example: 'ok' },
            }
          },
        },
      },
      headers: {
        'x-access-token': {
          description: 'New access token (if token was refreshed)',
          schema: { type: 'string' },
        },
      },
    },
    notFound: {
      status: 404,
      description: 'File not found in Cloudinary.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { 
            type: 'string', 
            example: 'File not found',
            description: 'Error message'
          },
          result: { 
            type: 'object',
            description: 'Cloudinary response',
            properties: {
              result: { type: 'string', example: 'not found' },
            }
          },
        },
      },
    },
    badRequest: {
      status: 400,
      description: 'Failed to delete file.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { 
            type: 'string', 
            example: 'Failed to delete file',
            description: 'Error message'
          },
          result: { 
            type: 'object',
            description: 'Cloudinary delete result'
          },
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

// Request body schemas
export const SwaggerBodies = {
  upload: {
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (JPEG, PNG, GIF, etc.)',
        },
      },
    },
  },
};
