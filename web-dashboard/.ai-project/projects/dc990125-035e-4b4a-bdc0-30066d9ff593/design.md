# Design Document

## Overview
HarakaPlus is a modern transportation platform for Rwanda, offering various services like business transit, daily commutes, and event transportation. It leverages an electric vehicle fleet and provides real-time GPS tracking through web and mobile apps. The platform utilizes Next.js 15, TypeScript, TailwindCSS, Shadcn-UI, Firebase Auth, and a Node.js with Express backend, hosted on Netlify.

## Architecture

### System Components
```mermaid
graph LR
    Client(Web/Mobile App) --> API Gateway --> Backend(Node.js/Express)
    Backend --> Database(MongoDB)
    Backend --> Firebase(Authentication)
    Backend --> GPS Service
```

### Data Flow
1. User interacts with the web or mobile app.
2. Request is sent to the API Gateway.
3. API Gateway routes the request to the appropriate backend service.
4. Backend interacts with the database, Firebase for authentication, and GPS service for location data.
5. Response is sent back to the client through the API Gateway.

## Components and Interfaces

### User Authentication
**Key Components:**
```typescript
interface User {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
}
```

### Booking Management
**Key Components:**
```typescript
interface Booking {
  id: string;
  userId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  serviceType: string;
  bookingTime: Date;
  status: string;
}

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}
```

## Data Models

```typescript
interface User {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
}
```
```json
{
  "uid": "12345",
  "email": "user@example.com",
  "displayName": "John Doe",
  "phoneNumber": "+250788123456"
}
```

## Error Handling

- **Client-side Errors:**  Invalid input, network issues.
- **Server-side Errors:** Database errors, authentication failures, GPS service unavailable.

## Testing Strategy

### Unit Testing
Individual components and functions will be tested using Jest and React Testing Library.

### Integration Testing
Interactions between different components and services will be tested.

### End-to-End Testing
Testing the entire application flow from user interaction to backend processing using Cypress or similar tools.

### Manual Testing
User acceptance testing and exploratory testing will be performed.
