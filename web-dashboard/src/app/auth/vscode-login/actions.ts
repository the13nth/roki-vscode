'use server';

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function generateVSCodeToken(userId: string, email: string, name: string) {
  try {
    if (!userId || !email) {
      throw new Error('Missing user information');
    }
    
    // Create a long-lived token (30 days) for VSCode
    const tokenPayload = {
      userId,
      email,
      name: name || 'User',
      type: 'vscode',
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      iat: Math.floor(Date.now() / 1000)
    };

    const token = sign(tokenPayload, JWT_SECRET);

    return {
      success: true,
      token,
      expiresIn: '30 days',
      userId,
      email,
      name: name || 'User'
    };

  } catch (error) {
    console.error('Token generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

