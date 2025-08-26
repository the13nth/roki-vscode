# Enhanced Token Tracking System

## Overview

The admin token tracking system has been significantly enhanced to provide comprehensive monitoring, rate limiting, alerting, and cost management for AI token usage across the platform.

## Current System Architecture

### 1. Token Tracking Service (`TokenTrackingService.ts`)

**Core Features:**
- Real-time token usage tracking for all AI operations
- Multi-provider cost calculation (Google Gemini, OpenAI GPT-4, Anthropic Claude)
- Rate limiting with daily, monthly, and burst limits
- Automatic alert generation for limit violations
- Session-based usage tracking
- Performance metrics (response time, success rate)

**Key Components:**
```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  projectId: string;
  userId?: string;
  analysisType: string;
  sessionId: string;
  provider?: string; // Track which AI provider was used
  model?: string; // Track specific model used
  responseTime?: number; // Track API response time
  success?: boolean; // Track if the request was successful
  errorMessage?: string; // Track any errors
}
```

### 2. Rate Limiting System

**Limits Configuration:**
- **Daily Limit**: 1,000,000 tokens per user per day
- **Monthly Limit**: 30,000,000 tokens per user per month  
- **Burst Limit**: 10,000 tokens per minute
- **Alert Threshold**: 80% of daily limit triggers warning

**Rate Limiting Logic:**
```typescript
private async checkRateLimit(userId: string, tokens: number): Promise<{ allowed: boolean; reason?: string }> {
  // Check daily limit
  // Check burst limit
  // Update usage tracking
  // Return result
}
```

### 3. Alert System

**Alert Types:**
- `daily_limit`: User approaching or exceeding daily token limit
- `monthly_limit`: User approaching or exceeding monthly token limit
- `burst_limit`: User exceeding burst rate limit
- `cost_threshold`: User exceeding cost threshold ($10/day default)

**Alert Severity Levels:**
- **Warning**: 80-90% of limit reached
- **Critical**: 90%+ of limit reached or exceeded

### 4. Admin Dashboard Enhancements

**New Features:**
- Real-time token usage alerts display
- Rate limiting status overview
- Cost trends and projections
- Enhanced user management table
- Alert management interface

**Dashboard Sections:**
1. **Overview Cards**: Users, Projects, Analyses, Cost
2. **Token Alerts**: Real-time alert display with filtering
3. **Rate Limiting Status**: Users at/near limits
4. **Cost Trends**: Daily averages and projections
5. **Enhanced User Management**: Detailed user analytics
6. **Alert Management**: Comprehensive alert history

## API Endpoints

### 1. Token Usage Tracking
```
POST /api/token-usage/track
```
Tracks individual token usage with enhanced metadata.

### 2. Admin Statistics
```
GET /api/admin/stats?timeRange=30d
```
Returns comprehensive admin statistics including:
- User analytics
- Token usage by user
- Cost breakdowns
- Rate limiting statistics
- Alert summaries

### 3. Token Alerts Management
```
GET /api/admin/token-alerts?timeRange=7d&severity=critical
POST /api/admin/token-alerts
```
Manages token alerts with filtering and actions.

## Improvements Made

### 1. Enhanced Token Tracking

**Before:**
- Basic token counting
- Single provider pricing
- No rate limiting
- No alerts

**After:**
- Multi-provider support
- Performance metrics tracking
- Comprehensive rate limiting
- Real-time alerting system
- Cost projections and trends

### 2. Rate Limiting Implementation

**Features:**
- **Daily Limits**: Prevents excessive daily usage
- **Burst Protection**: Prevents API abuse
- **Flexible Configuration**: Easy to adjust limits
- **User-Specific Limits**: Can be customized per user

**Implementation:**
```typescript
// In-memory rate limiting with daily reset
private rateLimits: Map<string, { tokens: number; lastReset: number; requests: number[] }> = new Map();
```

### 3. Alert System

**Real-time Monitoring:**
- Automatic alert generation
- Persistent storage in Pinecone
- Admin notification system
- Alert acknowledgment and dismissal

**Alert Management:**
- Filter by severity and time range
- Acknowledge alerts
- Update user limits
- Dismiss resolved alerts

### 4. Cost Management

**Multi-Provider Pricing:**
```typescript
private pricingConfig = {
  'google-gemini': {
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    model: 'gemini-1.5-flash'
  },
  'openai-gpt4': {
    inputCostPerMillion: 0.03,
    outputCostPerMillion: 0.06,
    model: 'gpt-4'
  },
  'anthropic-claude': {
    inputCostPerMillion: 0.015,
    outputCostPerMillion: 0.075,
    model: 'claude-3-sonnet'
  }
};
```

**Cost Analytics:**
- Daily cost averages
- Monthly projections
- Cost per token analysis
- Weekly growth tracking

### 5. Admin Dashboard Enhancements

**New Visualizations:**
- Alert status cards
- Rate limiting overview
- Cost trend charts
- User performance metrics

**Enhanced User Table:**
- Daily usage tracking
- Rate limit status indicators
- Monthly projections
- Cost breakdowns

## Usage Examples

### 1. Tracking Token Usage
```typescript
const tokenTrackingService = TokenTrackingService.getInstance();
const result = await tokenTrackingService.trackTokenUsage(
  projectId,
  inputTokens,
  outputTokens,
  analysisType,
  userId,
  'google-gemini',
  'gemini-1.5-flash',
  responseTime,
  true
);

if (!result.success) {
  console.log('Rate limit exceeded:', result.reason);
}
```

### 2. Getting User Analytics
```typescript
const dailyUsage = await tokenTrackingService.getDailyUsage(userId);
const cumulativeUsage = await tokenTrackingService.getCumulativeUsage(projectId);
const alerts = await tokenTrackingService.getAlerts('7d');
```

### 3. Admin Dashboard Access
```typescript
// Fetch admin statistics
const response = await fetch('/api/admin/stats?timeRange=30d');
const stats = await response.json();

// Manage alerts
const alertResponse = await fetch('/api/admin/token-alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'acknowledge',
    alertId: 'alert_123'
  })
});
```

## Configuration

### Environment Variables
```bash
# Required for token tracking
GOOGLE_AI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_PINECONE_INDEX_NAME=roki

# Optional: Custom rate limits
DAILY_TOKEN_LIMIT=1000000
MONTHLY_TOKEN_LIMIT=30000000
BURST_TOKEN_LIMIT=10000
COST_ALERT_THRESHOLD=10
```

### Rate Limit Configuration
```typescript
// Default limits (can be customized per user)
const defaultLimits = {
  dailyLimit: 1000000,    // 1M tokens per day
  monthlyLimit: 30000000, // 30M tokens per month
  burstLimit: 10000,      // 10K tokens per minute
  alertThreshold: 0.8     // 80% of limit triggers warning
};
```

## Monitoring and Maintenance

### 1. Alert Monitoring
- Monitor alert frequency and patterns
- Adjust limits based on usage patterns
- Review and acknowledge alerts regularly
- Update user limits as needed

### 2. Cost Optimization
- Track cost per token across providers
- Monitor usage patterns by analysis type
- Identify high-cost users or operations
- Optimize provider selection based on cost

### 3. Performance Monitoring
- Track API response times
- Monitor success rates
- Identify performance bottlenecks
- Optimize token usage efficiency

### 4. Data Retention
- Token usage data stored in Pinecone
- Alerts persisted for historical analysis
- User limits tracked over time
- Cost trends calculated from historical data

## Future Enhancements

### 1. Advanced Analytics
- Predictive usage modeling
- Anomaly detection
- Usage pattern analysis
- Cost optimization recommendations

### 2. User Management
- Individual user limit customization
- Usage quota management
- Billing integration
- Usage notifications to users

### 3. Provider Management
- Dynamic provider selection
- Cost-based routing
- Failover mechanisms
- Performance-based provider selection

### 4. Integration Features
- Webhook notifications
- Email alerts
- Slack integration
- Custom alert channels

## Security Considerations

### 1. Access Control
- Admin-only access to sensitive data
- User-specific data isolation
- Secure API endpoints
- Rate limiting protection

### 2. Data Privacy
- User data anonymization options
- Secure storage in Pinecone
- Audit logging
- Data retention policies

### 3. Cost Protection
- Hard limits to prevent excessive costs
- Real-time monitoring
- Automatic throttling
- Emergency shutdown capabilities

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Check user's daily usage
   - Review burst limit settings
   - Consider increasing limits for power users

2. **High Costs**
   - Analyze usage patterns
   - Review provider pricing
   - Implement cost optimization strategies

3. **Alert Spam**
   - Adjust alert thresholds
   - Review rate limit settings
   - Implement alert aggregation

4. **Performance Issues**
   - Monitor response times
   - Check provider status
   - Optimize token usage

### Debug Information
```typescript
// Enable debug logging
console.log('Token usage tracked:', tokenUsage);
console.log('Rate limit check:', rateLimitCheck);
console.log('Alert generated:', alert);
```

This enhanced token tracking system provides comprehensive monitoring, cost control, and user management capabilities while maintaining security and performance standards.



