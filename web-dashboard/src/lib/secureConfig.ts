import crypto from 'crypto';

// Security configuration interface
export interface SecurityConfig {
  encryptionKey: string;
  encryptionSalt: string;
  isProduction: boolean;
}

// API configuration interface
export interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

// Audit log entry interface
export interface AuditLogEntry {
  timestamp: Date;
  operation: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class SecureConfigManager {
  private static instance: SecureConfigManager;
  private auditLog: AuditLogEntry[] = [];
  private securityConfig: SecurityConfig;

  private constructor() {
    try {
      this.securityConfig = this.loadSecurityConfig();
    } catch (error) {
      // Initialize with default values if loading fails
      this.securityConfig = {
        encryptionKey: '',
        encryptionSalt: '',
        isProduction: false
      };
      console.warn('Failed to load security configuration:', error);
    }
  }

  public static getInstance(): SecureConfigManager {
    if (!SecureConfigManager.instance) {
      SecureConfigManager.instance = new SecureConfigManager();
    }
    return SecureConfigManager.instance;
  }

  private loadSecurityConfig(): SecurityConfig {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const encryptionSalt = process.env.ENCRYPTION_SALT;
    const isProduction = process.env.NODE_ENV === 'production';

    // Allow missing encryption config during build time
    if ((!encryptionKey || !encryptionSalt) && process.env.NODE_ENV !== 'production') {
      this.logAudit('LOAD_SECURITY_CONFIG', false, 'Missing encryption configuration - using defaults for build');
      return {
        encryptionKey: 'build-time-fallback-key-32-chars!!',
        encryptionSalt: 'build-time-fallback-salt-16-chars!!',
        isProduction: false
      };
    }

    if (!encryptionKey || !encryptionSalt) {
      this.logAudit('LOAD_SECURITY_CONFIG', false, 'Missing encryption configuration');
      throw new Error('Missing encryption configuration. Please set ENCRYPTION_KEY and ENCRYPTION_SALT environment variables.');
    }

    if (encryptionKey.length < 32) {
      this.logAudit('LOAD_SECURITY_CONFIG', false, 'Encryption key too short');
      throw new Error('Encryption key must be at least 32 characters long.');
    }

    if (encryptionSalt.length < 16) {
      this.logAudit('LOAD_SECURITY_CONFIG', false, 'Encryption salt too short');
      throw new Error('Encryption salt must be at least 16 characters long.');
    }

    this.logAudit('LOAD_SECURITY_CONFIG', true, 'Security configuration loaded successfully');
    return { encryptionKey, encryptionSalt, isProduction };
  }

  public encrypt(plaintext: string): string {
    try {
      if (!this.securityConfig.isProduction) {
        // In development, return plaintext for easier debugging
        this.logAudit('ENCRYPT', true, 'Development mode - no encryption applied');
        return plaintext;
      }

      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.securityConfig.encryptionKey, this.securityConfig.encryptionSalt, 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAutoPadding(true);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Prepend IV to encrypted data
      const result = iv.toString('hex') + ':' + encrypted;
      
      this.logAudit('ENCRYPT', true, 'Data encrypted successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      this.logAudit('ENCRYPT', false, errorMessage);
      throw new Error(`Encryption failed: ${errorMessage}`);
    }
  }

  public decrypt(encryptedData: string): string {
    try {
      if (!this.securityConfig.isProduction) {
        // In development, return data as-is
        this.logAudit('DECRYPT', true, 'Development mode - no decryption needed');
        return encryptedData;
      }

      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.securityConfig.encryptionKey, this.securityConfig.encryptionSalt, 32);
      
      // Extract IV and encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      this.logAudit('DECRYPT', true, 'Data decrypted successfully');
      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
      this.logAudit('DECRYPT', false, errorMessage);
      throw new Error(`Decryption failed: ${errorMessage}. Please check your encryption configuration.`);
    }
  }

  public getGoogleAIConfig(): ApiConfiguration {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      const model = process.env.GOOGLE_AI_MODEL || 'gemini-1.5-pro';
      
      if (!apiKey) {
        this.logAudit('GET_GOOGLE_AI_CONFIG', false, 'Missing Google AI API key');
        throw new Error('Google AI API key not configured. Please set GOOGLE_AI_API_KEY environment variable.');
      }

      const config: ApiConfiguration = {
        provider: 'google',
        apiKey: this.securityConfig.isProduction ? this.decrypt(apiKey) : apiKey,
        model,
        baseUrl: 'https://generativelanguage.googleapis.com'
      };

      this.logAudit('GET_GOOGLE_AI_CONFIG', true, 'Google AI configuration retrieved');
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
      this.logAudit('GET_GOOGLE_AI_CONFIG', false, errorMessage);
      throw new Error(`Failed to get Google AI configuration: ${errorMessage}`);
    }
  }

  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Validate security configuration
      if (!this.securityConfig.encryptionKey) {
        errors.push('Missing encryption key');
      }
      if (!this.securityConfig.encryptionSalt) {
        errors.push('Missing encryption salt');
      }

      // Validate Google AI configuration
      if (!process.env.GOOGLE_AI_API_KEY) {
        errors.push('Missing Google AI API key');
      }

      // Test encryption/decryption if in production
      if (this.securityConfig.isProduction) {
        try {
          const testData = 'test-encryption-data';
          const encrypted = this.encrypt(testData);
          const decrypted = this.decrypt(encrypted);
          if (decrypted !== testData) {
            errors.push('Encryption/decryption test failed');
          }
        } catch (error) {
          errors.push(`Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const isValid = errors.length === 0;
      this.logAudit('VALIDATE_CONFIGURATION', isValid, isValid ? 'Configuration valid' : `Validation errors: ${errors.join(', ')}`);
      
      return { isValid, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(errorMessage);
      this.logAudit('VALIDATE_CONFIGURATION', false, errorMessage);
      return { isValid: false, errors };
    }
  }

  private logAudit(operation: string, success: boolean, message?: string, metadata?: Record<string, any>): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation,
      success,
      error: success ? undefined : message,
      metadata
    };

    this.auditLog.push(entry);

    // Keep only last 1000 entries to prevent memory issues
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Log to console in development
    if (this.securityConfig && !this.securityConfig.isProduction) {
      console.log(`[AUDIT] ${operation}: ${success ? 'SUCCESS' : 'FAILURE'}${message ? ` - ${message}` : ''}`);
    }
  }

  public getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog]; // Return copy to prevent modification
  }

  public clearAuditLog(): void {
    this.auditLog = [];
    this.logAudit('CLEAR_AUDIT_LOG', true, 'Audit log cleared');
  }
}

// Export singleton instance
export const secureConfig = SecureConfigManager.getInstance();

// Export utility functions
export const encryptApiKey = (apiKey: string): string => secureConfig.encrypt(apiKey);
export const decryptApiKey = (encryptedApiKey: string): string => secureConfig.decrypt(encryptedApiKey);
export const getGoogleAIConfig = (): ApiConfiguration => secureConfig.getGoogleAIConfig();
export const validateSecureConfig = () => secureConfig.validateConfiguration();
export const getSecurityAuditLog = () => secureConfig.getAuditLog();