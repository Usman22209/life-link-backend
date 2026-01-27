export const ProfileSwaggerResponses = {
    getProfile: {
        success: {
            status: 200,
            description: 'Profile fetched successfully',
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    profile: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            phone: { type: 'string' },
                            gender: { type: 'string' },
                            blood_group: { type: 'string' },
                            is_onboarded: { type: 'boolean' },
                        }
                    }
                }
            }
        },
        notFound: {
            status: 404,
            description: 'Profile not found',
            schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Profile not found' },
                    error: { type: 'string', example: 'Not Found' },
                }
            }
        }
    },
    updateProfile: {
        success: {
            status: 200,
            description: 'Profile updated successfully',
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile updated successfully' },
                    profile: { type: 'object' }
                }
            }
        },
        badRequest: {
            status: 400,
            description: 'Bad request - Invalid data',
            schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Could not update profile' },
                    error: { type: 'string', example: 'Bad Request' },
                }
            }
        }
    }
};
