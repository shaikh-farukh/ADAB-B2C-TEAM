import psycopg2
import sys

def check_db():
    try:
        conn = psycopg2.connect(
            host='ep-restless-hat-azawryc7-pooler.c-3.ap-southeast-1.aws.neon.tech',
            dbname='neondb',
            user='neondb_owner',
            password='npg_YHgOFwUDz54R',
            port=5432,
            sslmode='require'
        )
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Connected! Total tables: {len(tables)}")
        print("Tables:", tables)
        conn.close()
    except Exception as e:
        print("Error:", e, file=sys.stderr)

if __name__ == '__main__':
    check_db()
