import { NextRequest, NextResponse } from 'next/server';
import { validateSecureConfig, getSecurityAuditLog } from '@/lib/secureConfig';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate configuration
    const validation = validateSecureConfig();
    
    // Get audit log (last 50 entries)
    const auditLog = getSecurityAuditLog().slice(-50);

    return NextResponse.json({
      isValid: validation.isValid,
      errors: validation.errors,
      environment: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      hasEncryptionSalt: !!process.env.ENCRYPTION_SALT,
      hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
      auditLog: auditLog.map(entry => ({
        timestamp: entry.timestamp,
        operation: entry.operation,
        success: entry.success,
        error: entry.error
      }))
    });
  } catch (error) {
    console.error('❌ Security config check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check security configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'validate') {
      const validation = validateSecureConfig();
      return NextResponse.json(validation);
    }

    if (action === 'test-encryption') {
      try {
        const { secureConfig } = await import('@/lib/secureConfig');
        const testData = 'test-encryption-data-' + Date.now();
        const encrypted = secureConfig.encrypt(testData);
        const decrypted = secureConfig.decrypt(encrypted);
        
        const success = decrypted === testData;
        return NextResponse.json({
          success,
          message: success ? 'Encryption test passed' : 'Encryption test failed',
          isProduction: process.env.NODE_ENV === 'production'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isProduction: process.env.NODE_ENV === 'production'
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Security config operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to perform security operation' },
      { status: 500 }
    );
  }
}