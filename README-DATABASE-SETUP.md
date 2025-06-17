# Database Setup Guide

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/projectmanagement_dev?schema=public"

# NextAuth.js Configuration
NEXTAUTH_SECRET="your-super-secret-jwt-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Development Environment
NODE_ENV="development"
```

### 2. PostgreSQL Setup

#### Option A: Local PostgreSQL Installation

1. Install PostgreSQL 14+ on your system
2. Create a database:
   ```sql
   CREATE DATABASE projectmanagement_dev;
   CREATE USER pm_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE projectmanagement_dev TO pm_user;
   ```

#### Option B: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run --name postgres-pm \
  -e POSTGRES_DB=projectmanagement_dev \
  -e POSTGRES_USER=pm_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:14
```

### 3. Database Initialization

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Apply schema to database
npm run db:push

# Seed initial Root Admin account
npm run db:seed
```

### 4. Verify Setup

```bash
# Check database connection and explore data
npm run db:studio
```

## Available Database Scripts

| Script                | Description                             |
| --------------------- | --------------------------------------- |
| `npm run db:generate` | Generate Prisma client from schema      |
| `npm run db:push`     | Push schema to database (development)   |
| `npm run db:migrate`  | Create and apply migrations             |
| `npm run db:reset`    | Reset database and apply all migrations |
| `npm run db:seed`     | Seed initial Root Admin account         |
| `npm run db:studio`   | Open Prisma Studio database browser     |

## Root Admin Credentials

After running `npm run db:seed`, you'll see output like:

```
🔑 === ROOT ADMIN CREDENTIALS ===
📧 Email: admin@company.com
🔐 Password: [Generated Password]
🆔 User ID: [UUID]
👤 Name: System Administrator
🛡️  Role: ROOT_ADMIN
🕒 Created: [Timestamp]
================================

⚠️  IMPORTANT: Save these credentials securely!
   This password will not be displayed again.
```

## Production Setup

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&sslmode=require"
NEXTAUTH_SECRET="production-secret-minimum-32-characters"
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

### Migration Deployment

```bash
# Generate production client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed production data (run once)
npm run db:seed
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: Can't reach database server at `localhost:5432`
```

**Solutions:**

1. Verify PostgreSQL is running
2. Check DATABASE_URL environment variable
3. Ensure database exists and user has permissions
4. Check firewall/network connectivity

#### Migration Conflicts

```
Error: Migration failed to apply cleanly
```

**Solutions:**

1. Reset development database: `npm run db:reset`
2. Check for manual database changes
3. Review migration history

#### Prisma Client Not Generated

```
Error: Cannot resolve @prisma/client
```

**Solutions:**

1. Run `npm run db:generate`
2. Check Prisma schema syntax
3. Restart TypeScript server

### Development Tips

#### Reset Everything

```bash
npm run db:reset
npm run db:seed
```

#### Check Schema Sync

```bash
npx prisma db pull  # Pull current database schema
npx prisma format   # Format schema file
```

#### Database Backup

```bash
# Create backup
pg_dump projectmanagement_dev > backup.sql

# Restore backup
psql projectmanagement_dev < backup.sql
```

## Security Checklist

- [ ] Strong database passwords
- [ ] Secure NEXTAUTH_SECRET (32+ characters)
- [ ] Database user with minimal privileges
- [ ] SSL enabled for production database
- [ ] Environment variables not committed to git
- [ ] Root Admin password saved securely

## Schema Changes

When modifying the database schema:

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Test migration thoroughly
4. Update validation schemas in `src/lib/validation/`
5. Update TypeScript types if needed

## Performance Optimization

### Connection Pooling

Production database URL with connection pooling:

```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&connection_limit=10&pool_timeout=20"
```

### Index Monitoring

```sql
-- Check index usage
SELECT
    indexrelname as index_name,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

## Backup Strategy

### Automated Backups (Production)

```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_${DATE}.sql"
gzip "backup_${DATE}.sql"

# Upload to cloud storage
aws s3 cp "backup_${DATE}.sql.gz" s3://your-backup-bucket/
```

### Point-in-Time Recovery

Enable WAL archiving for point-in-time recovery:

```postgresql
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

## Monitoring

### Health Check Endpoint

Add to your application:

```typescript
// pages/api/health/db.ts
import { db } from "@/lib/db";

export default async function handler(req, res) {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "healthy" });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", error: error.message });
  }
}
```

### Database Metrics

Monitor these key metrics:

- Connection pool usage
- Query response times
- Active connections
- Database size growth
- Index hit ratios

## Support

### Getting Help

1. Check [Prisma Documentation](https://www.prisma.io/docs/)
2. Review [PostgreSQL Documentation](https://www.postgresql.org/docs/)
3. Check application logs for specific errors
4. Use `npm run db:studio` to explore data

### Reporting Issues

When reporting database issues, include:

- Error messages (full stack trace)
- Environment details (Node.js, PostgreSQL versions)
- Steps to reproduce
- Current database schema version
- Recent migration history
