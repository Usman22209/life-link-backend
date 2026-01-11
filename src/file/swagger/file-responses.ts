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
          success: { type: 'boolean', example: true },
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
    },
    badRequest: {
      status: 400,
      description: 'Bad request - Invalid file or upload failed',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Upload failed' },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Missing or invalid token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Missing access token' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
  },

  // Delete file responses
  delete: {
    success: {
      status: 201,
      description: 'File deleted successfully from Cloudinary.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'File deleted successfully' },
          result: {
            type: 'object',
            properties: {
              result: { type: 'string', example: 'ok' },
            }
          },
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
          message: { type: 'string', example: 'File not found' },
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
          message: { type: 'string', example: 'Failed to delete file' },
        },
      },
    },
    unauthorized: {
      status: 401,
      description: 'Unauthorized - Invalid token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid or expired token' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    },
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
