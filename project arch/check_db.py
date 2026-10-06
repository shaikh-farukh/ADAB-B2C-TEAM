import psycopg2
import sys

def check_db():
    try:
        conn = psycopg2.connect(
            host='dpg-davljkid0e5s738fkddg-a.oregon-postgres.render.com',
            dbname='adab_b2c_team',
            user='adab_b2c_team_user',
            password='XBl5rzgqY22fI75kE1zjHUNdMhrzLyen',
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
