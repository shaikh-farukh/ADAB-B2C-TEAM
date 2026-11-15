import psycopg2
import sys

def execute_migration():
    try:
        conn = psycopg2.connect(
            host='ep-restless-hat-azawryc7-pooler.c-3.ap-southeast-1.aws.neon.tech',
            dbname='neondb',
            user='neondb_owner',
            password='npg_YHgOFwUDz54R',
            port=5432,
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
