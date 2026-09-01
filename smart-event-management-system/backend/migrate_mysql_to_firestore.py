"""
Optional MySQL to Firebase Firestore Data Migration Script.
Run this script only if you have existing data in MySQL that you wish to transfer to Firestore.

Usage:
    python migrate_mysql_to_firestore.py --mysql-url="mysql+pymysql://root:password@localhost:3306/smart_event_management"
"""
import argparse
import logging
from datetime import datetime, timezone
import sys

try:
    import pymysql
except ImportError:
    print("Error: pymysql is required to run the migration script. Run: pip install pymysql")
    sys.exit(1)

from app.core.firebase import get_firestore_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")


def parse_mysql_url(url: str):
    # format: mysql+pymysql://user:pass@host:port/dbname
    # or: mysql://user:pass@host:port/dbname
    cleaned = url.replace("mysql+pymysql://", "").replace("mysql://", "")
    auth, rest = cleaned.split("@")
    user, password = auth.split(":") if ":" in auth else (auth, "")
    host_port, dbname = rest.split("/")
    host, port = host_port.split(":") if ":" in host_port else (host_port, 3306)
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": int(port),
        "database": dbname.split("?")[0],
    }


def migrate_table(cursor, firestore_db, table_name: str, id_col: str = "id"):
    logger.info(f"Migrating table: {table_name}...")
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    collection_ref = firestore_db.collection(table_name)
    max_id = 0
    batch = firestore_db.batch()
    count = 0

    for row in rows:
        doc_id = str(row[id_col])
        if isinstance(row[id_col], int) and row[id_col] > max_id:
            max_id = row[id_col]

        # Clean datetime objects for Firestore
        cleaned_data = {}
        for k, v in row.items():
            if isinstance(v, datetime) and v.tzinfo is None:
                cleaned_data[k] = v.replace(tzinfo=timezone.utc)
            else:
                cleaned_data[k] = v

        doc_ref = collection_ref.document(doc_id)
        batch.set(doc_ref, cleaned_data)
        count += 1

        if count % 400 == 0:
            batch.commit()
            batch = firestore_db.batch()
            logger.info(f"  Committed batch of 400 records to {table_name}")

    if count % 400 != 0:
        batch.commit()

    # Update counter
    if max_id > 0:
        firestore_db.collection("_counters").document(table_name).set({"current_id": max_id})

    logger.info(f"Successfully migrated {count} records for {table_name} (max ID: {max_id}).")


def run_migration(mysql_url: str):
    config = parse_mysql_url(mysql_url)
    logger.info(f"Connecting to MySQL at {config['host']}:{config['port']}/{config['database']}...")
    
    conn = pymysql.connect(
        host=config["host"],
        port=config["port"],
        user=config["user"],
        password=config["password"],
        database=config["database"],
        cursorclass=pymysql.cursors.DictCursor,
    )

    firestore_db = get_firestore_db()

    tables = [
        "users",
        "events",
        "registrations",
        "certificates",
        "notifications",
        "password_resets",
        "email_verifications",
        "audit_logs",
    ]

    with conn.cursor() as cursor:
        for table in tables:
            try:
                migrate_table(cursor, firestore_db, table)
            except Exception as e:
                logger.warning(f"Skipping table {table} or encountered error: {e}")

    conn.close()
    logger.info("Migration from MySQL to Firestore completed!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate MySQL data to Firebase Firestore")
    parser.add_argument("--mysql-url", required=True, help="MySQL connection URL (e.g. mysql+pymysql://root:password@localhost:3306/smart_event_management)")
    args = parser.parse_args()
    run_migration(args.mysql_url)
