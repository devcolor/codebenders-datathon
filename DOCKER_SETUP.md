# Docker Setup for Postgres

This guide explains how to set up Postgres using Docker Compose for local development.

> **Note:** The primary local development path uses [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase start`), which spins up a full Supabase stack including Postgres. Use this Docker Compose setup as a lightweight alternative when you don't need the full Supabase stack.

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .docker.env.example .docker.env
   ```

2. **Edit `.docker.env`** (optional - defaults will work):
   ```bash
   # Update passwords and settings as needed
   ```

3. **Start Postgres**:
   ```bash
   docker-compose up -d
   ```

4. **Verify it's running**:
   ```bash
   docker-compose ps
   ```

5. **Connect to database**:
   ```bash
   # Using psql client
   psql -h 127.0.0.1 -p 5432 -U postgres -d bishop_state

   # Or using Docker
   docker-compose exec postgres psql -U postgres -d bishop_state
   ```

## Services

### Postgres
- **Port**: 5432 (default)
- **Database**: `bishop_state`
- **User**: `postgres` (default)
- **Password**: `devcolor2025` (default, change in `.docker.env`)

### pgAdmin (Optional)
- **Port**: 8080 (default)
- **URL**: http://localhost:8080
- **Email**: `admin@bishopstate.edu` (default)
- **Password**: `devcolor2025` (default)

To connect pgAdmin to the Postgres container, add a new server with:
- Host: `postgres` (the Docker service name)
- Port: `5432`
- Username: `postgres`
- Password: `devcolor2025`

## Data Persistence

Database data is stored in a Docker volume named `postgres_data`. This means:
- Data persists even if you stop/remove the container
- Data is shared across container restarts
- To remove all data: `docker-compose down -v`

## Initialization

SQL files in `database_dumps/` are automatically executed on first startup (when the database is empty). Files run in alphabetical order.

**Note**: The `database_dumps/` directory is mounted as read-only.

## Environment Variables

All configuration is in `.docker.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `devcolor2025` | Database password |
| `POSTGRES_DB` | `bishop_state` | Database name |
| `POSTGRES_PORT` | `5432` | Host port mapping |
| `PGADMIN_EMAIL` | `admin@bishopstate.edu` | pgAdmin login email |
| `PGADMIN_PASSWORD` | `devcolor2025` | pgAdmin login password |
| `PGADMIN_PORT` | `8080` | pgAdmin port |

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose stop
```

### Stop and remove containers
```bash
docker-compose down
```

### Stop and remove containers + volumes (⚠️ deletes data)
```bash
docker-compose down -v
```

### View logs
```bash
docker-compose logs -f postgres
```

### Execute SQL commands
```bash
docker-compose exec postgres psql -U postgres -d bishop_state
```

### Backup database
```bash
docker-compose exec postgres pg_dump -U postgres bishop_state > backup.sql
```

### Restore database
```bash
docker-compose exec -T postgres psql -U postgres -d bishop_state < backup.sql
```

## Connecting from Python

Update your `operations/db_config.py` or `.env` file:

```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=devcolor2025
DB_PORT=5432
DB_NAME=bishop_state
```

## Connecting from Next.js Dashboard

Update `codebenders-dashboard/.env.local`:

```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=devcolor2025
DB_PORT=5432
DB_NAME=bishop_state
DB_SSL=false
```

## Troubleshooting

### Port already in use
If port 5432 is already in use (e.g., local Postgres or Supabase is running), change `POSTGRES_PORT` in `.docker.env`:
```env
POSTGRES_PORT=5433
```
Then update your connection strings to use port 5433.

### Permission denied
Make sure Docker has permission to access the `database_dumps/` directory:
```bash
chmod -R 755 database_dumps/
```

### Database not initializing
Check logs:
```bash
docker-compose logs postgres
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d
```

## Health Check

The Postgres container includes a health check via `pg_isready`. Verify it's healthy:
```bash
docker-compose ps
```

You should see `healthy` status for the postgres service.

## Security Notes

⚠️ **For Development Only**: This setup uses default passwords. For production:
1. Use strong, unique passwords
2. Don't expose ports publicly
3. Use environment variables or secrets management
4. Consider using Docker secrets for production

## References

- [Postgres Docker Image](https://hub.docker.com/_/postgres)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (primary local dev path)
