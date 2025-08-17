import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        // Get the current user from Clerk
        const user = await currentUser();
        
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }
        
        // Create a long-lived token (30 days) for VSCode
        const tokenPayload = {
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username || 'User',
            type: 'vscode',
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
            iat: Math.floor(Date.now() / 1000)
        };

        const token = sign(tokenPayload, JWT_SECRET);

        return NextResponse.json({
            token,
            expiresIn: '30 days',
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username || 'User'
        });

    } catch (error) {
        console.error('Token generation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
