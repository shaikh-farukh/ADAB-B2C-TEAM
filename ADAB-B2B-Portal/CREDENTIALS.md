# Local Development Credentials

Since the local development database starts empty, the following credentials should be used for testing.

> **Team Note:** This database is local to your Docker container. When a new team member clones this repository or takes a pull from the `development` branch, they must execute the following commands inside the backend container to ensure their local database is completely up-to-date with the latest schema changes and test data:
> 
> ```bash
> # 1. Run ALL new database migrations
> # Check BOTH the root `migrations/` folder (.sql files) AND the `backend/migrations/` folder (.js files)
> # For new .sql files (e.g. 011_add_missing_columns.sql):
> docker exec -i adab_b2b_db psql -U adab_user -d adab_b2b_db < migrations/011_add_missing_columns.sql
> 
> # For new .js files (e.g. fix_campaign_tables.js):
> docker exec adab_b2b_backend node migrations/fix_campaign_tables.js
> # 2. Seed the necessary local user accounts
> docker exec adab_b2b_backend node seed_users.js
> 
> # 3. Seed real test data (Products, Orders, Campaigns, etc.)
> docker exec adab_b2b_backend node seed_real_data.js
> ```

## Super Admin Account
- **Email:** `superadmin@adab.com`
- **Password:** `Adab@Enterprise2026!`

## Manufacturer Account
- **Email:** `manufacturer@adab.com`
- **Password:** `Adab@Enterprise2026!`

## Distributor Account
- **Email:** `distributor@adab.com`
- **Password:** `Adab@Enterprise2026!`

## Shop Account
- **Email:** `shop@adab.com`
- **Password:** `Adab@Enterprise2026!`
