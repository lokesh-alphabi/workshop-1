# Authentication System Setup

## Overview

The authentication system uses NextAuth.js with a custom Prisma adapter for secure user authentication, session management, and role-based access control.

## Key Features

- ✅ **Custom Credentials Provider**: Email/password authentication
- ✅ **Account Lockout**: Protection against brute force attacks (10 attempts/hour)
- ✅ **Rate Limiting**: 5 attempts per 5-minute window per IP
- ✅ **Role-Based Access Control**: ROOT_ADMIN, ADMIN, EMPLOYEE roles
- ✅ **JWT Sessions**: 24-hour session expiration with auto-refresh
- ✅ **Secure Password Hashing**: bcrypt with 12 salt rounds
- ✅ **Middleware Protection**: Automatic route protection
- ✅ **Comprehensive Error Handling**: User-friendly error messages

## Files Created

### Core Authentication

- `src/lib/auth.ts` - NextAuth.js configuration
- `src/lib/auth-utils.ts` - Server-side authentication utilities
- `src/middleware.ts` - Route protection middleware

### API Routes

- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js endpoints

### Pages & Components

- `src/app/auth/signin/page.tsx` - Login page
- `src/app/auth/error/page.tsx` - Authentication error page
- `src/app/unauthorized/page.tsx` - Unauthorized access page
- `src/components/auth/login-form.tsx` - Login form component
- `src/components/providers/session-provider.tsx` - Session provider

### Dashboard

- `src/app/dashboard/page.tsx` - Protected dashboard page
- `src/components/dashboard/dashboard-layout.tsx` - Dashboard layout

### Tests

- `src/lib/__tests__/auth.test.ts` - Authentication system tests

## Environment Variables Required

Create a `.env.local` file in your project root:

\`\`\`env

# Database URL for Prisma

DATABASE_URL="postgresql://postgres:password@localhost:5432/project_manager"

# NextAuth.js Configuration

NEXTAUTH_SECRET="your-super-secret-nextauth-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Development flag

NODE_ENV="development"
\`\`\`

## Security Features

### Account Lockout

- **Trigger**: 10 failed login attempts
- **Duration**: 1 hour lockout
- **Auto-Reset**: Lockout expires automatically
- **Failed Attempt Reset**: Successful login resets failed attempt counter

### Rate Limiting

- **Window**: 5 minutes per IP address
- **Limit**: 5 login attempts per window
- **Storage**: In-memory (should use Redis in production)

### Password Security

- **Hashing**: bcrypt with 12 salt rounds
- **Validation**: Minimum 6 characters (configurable)
- **Timing Attack Protection**: Consistent response times

## Role-Based Access Control

### Role Hierarchy

1. **ROOT_ADMIN** - Full system access
2. **ADMIN** - Project management and user management
3. **EMPLOYEE** - Access to assigned projects only

### Protected Routes

- `/dashboard/*` - Requires authentication
- `/admin/*` - Requires ADMIN or ROOT_ADMIN role
- `/system/*` - Requires ROOT_ADMIN role only

### Middleware Protection

The middleware automatically:

- Redirects unauthenticated users to `/auth/signin`
- Checks role permissions for protected routes
- Handles API route authentication
- Prevents access to auth pages when logged in

## Usage Examples

### Server Components

\`\`\`typescript
import { requireAuth, requireRole } from '@/lib/auth-utils';

// Require any authenticated user
const user = await requireAuth();

// Require admin role
const admin = await requireAdmin();

// Require specific role
const rootAdmin = await requireRole('ROOT_ADMIN');
\`\`\`

### Client Components

\`\`\`typescript
import { useSession, signOut } from 'next-auth/react';

function MyComponent() {
const { data: session, status } = useSession();

if (status === 'loading') return <p>Loading...</p>;
if (status === 'unauthenticated') return <p>Access Denied</p>;

return <p>Welcome {session.user.name}!</p>;
}
\`\`\`

### API Routes

\`\`\`typescript
import { validateApiSession, validateApiRole } from '@/lib/auth-utils';

export async function GET() {
const { user, error, status } = await validateApiSession();

if (error) {
return NextResponse.json({ error }, { status });
}

// User is authenticated
return NextResponse.json({ data: 'success' });
}
\`\`\`

## Testing

Run the authentication tests:

\`\`\`bash
npm run test src/lib/**tests**/auth.test.ts
\`\`\`

## Error Handling

### Login Errors

- **Invalid Credentials**: User-friendly message without revealing if email exists
- **Account Locked**: Clear message about lockout duration
- **Rate Limited**: Warning about too many attempts
- **Validation Errors**: Field-specific error messages

### Route Protection

- **Unauthenticated**: Redirect to login with return URL
- **Insufficient Permissions**: Redirect to unauthorized page
- **Session Expired**: Automatic redirect to login

## Security Considerations

### Production Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ random characters)
- [ ] Enable HTTPS in production (`NEXTAUTH_URL=https://...`)
- [ ] Use Redis for rate limiting store
- [ ] Configure proper CORS settings
- [ ] Set up monitoring for failed login attempts
- [ ] Implement audit logging
- [ ] Use environment-specific secrets

### Additional Security Measures

- CSP headers for XSS protection
- CSRF protection (built into NextAuth.js)
- Secure session cookies
- Input validation on all endpoints
- SQL injection prevention (Prisma ORM)

## Troubleshooting

### Common Issues

1. **"Authentication required" on dashboard**

   - Check if `.env.local` exists with correct variables
   - Verify database connection and seeded Root Admin user

2. **Middleware redirect loops**

   - Check middleware config matcher patterns
   - Verify session provider is wrapped around app

3. **TypeScript errors in auth files**
   - Ensure NextAuth types are properly extended
   - Check import paths for auth utilities

### Debug Mode

Enable debug logging by setting:
\`\`\`env
NEXTAUTH_DEBUG=true
\`\`\`

## Next Steps

1. **Test the authentication flow**:

   - Create the Root Admin user with the seed script
   - Test login/logout functionality
   - Verify role-based access control

2. **Enhance security**:

   - Implement audit logging
   - Add 2FA support
   - Set up monitoring

3. **Customize**:
   - Add password reset functionality
   - Implement user profile management
   - Add social login providers if needed
