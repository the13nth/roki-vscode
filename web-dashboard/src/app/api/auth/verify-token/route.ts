import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            // Verify the JWT token
            const decoded = verify(token, JWT_SECRET) as any;
            
            // Check if it's a VSCode token
            if (decoded.type !== 'vscode') {
                return NextResponse.json(
                    { error: 'Invalid token type' },
                    { status: 401 }
                );
            }

            // Check if token is expired
            if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
                return NextResponse.json(
                    { error: 'Token expired' },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                userId: decoded.userId,
                email: decoded.email,
                name: decoded.name
            });

        } catch (error) {
            console.error('Token verification failed:', error);
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

    } catch (error) {
        console.error('Auth verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}