import psycopg2
import sys

def run_migration():
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
        
        print("Reading migrations/004_sync_b2b_manufacturer_flow.sql...")
        with open('migrations/004_sync_b2b_manufacturer_flow.sql', 'r', encoding='utf-8') as f:
            sql = f.read()

        print("Executing migration on live database...")
        cur.execute(sql)
        print("Successfully applied 004_sync_b2b_manufacturer_flow.sql to live database!")

        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND (table_name LIKE '%manage%' OR table_name LIKE '%distributor_products%')
            ORDER BY table_name;
        """)
        synced_tables = [r[0] for r in cur.fetchall()]
        print(f"Total synced B2B tables verified ({len(synced_tables)}):")
        for t in synced_tables:
            print(f"  - {t}")

        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'seller_listings' AND column_name = 'manufacturer_product_id';
        """)
        col = cur.fetchall()
        print("seller_listings cross-link column check:", col)

        conn.close()
    except Exception as e:
        print("Migration execution error:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    run_migration()
