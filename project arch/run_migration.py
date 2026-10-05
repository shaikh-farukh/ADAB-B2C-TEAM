import psycopg2
import sys

def execute_migration():
    try:
        conn = psycopg2.connect(
            host='dpg-davljkid0e5s738fkddg-a.oregon-postgres.render.com',
            dbname='adab_b2c_team',
            user='adab_b2c_team_user',
            password='XBl5rzgqY22fI75kE1zjHUNdMhrzLyen',
            sslmode='require'
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("1. Fetching existing tables...")
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Found {len(tables)} tables to drop.")

        print("2. Dropping all tables with CASCADE...")
        for t in tables:
            cur.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE;')
        print("All existing tables dropped successfully.")

        print("3. Reading and executing schema.sql...")
        with open('schema.sql', 'r', encoding='utf-8') as f:
            sql = f.read()

        cur.execute(sql)
        print("Schema DDL executed successfully!")

        print("4. Verifying created tables...")
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        created_tables = [r[0] for r in cur.fetchall()]
        print(f"Successfully created {len(created_tables)} tables:")
        print(created_tables)

        conn.close()
    except Exception as e:
        print("Migration Error:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    execute_migration()
