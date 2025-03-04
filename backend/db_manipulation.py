import pandas as pd
from sqlalchemy import create_engine, text
import os
from datetime import datetime
import logging
import sys

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), 'log')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'db_manipulation_log.txt')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def find_duplicates():
    try:
        # Database connection setup
        hostname = "10.10.5.27"
        database = "KSSB_V2"
        username = "root"
        password = "tarcinakubik"
        engine = create_engine(f"mysql+pymysql://{username}:{password}@{hostname}/{database}")

        # First check if there are any records to check
        with engine.connect() as connection:
            check_query = text("""
                SELECT COUNT(*) as count 
                FROM clani c 
                JOIN kontakti k ON c.id_clana = k.id_clana 
                WHERE k.email IS NOT NULL 
                AND k.telefon IS NOT NULL
            """)
            result = connection.execute(check_query)
            count = result.fetchone()[0]
            
            if count == 0:
                logger.info("No records found in database that can be checked for duplicates.")
                return

            # Find duplicates with a single query
            query = text("""
                WITH duplicates AS (
                    SELECT 
                        c.id_clana,
                        c.ime,
                        c.priimek,
                        k.email,
                        k.telefon,
                        cp.datum_vclanitve,
                        COUNT(*) OVER (
                            PARTITION BY c.ime, c.priimek, k.email, k.telefon
                        ) as group_count
                    FROM clani c
                    JOIN kontakti k ON c.id_clana = k.id_clana
                    LEFT JOIN casovni_podatki cp ON c.id_clana = cp.id_clana
                    WHERE k.email IS NOT NULL 
                    AND k.telefon IS NOT NULL
                )
                SELECT *
                FROM duplicates
                WHERE group_count > 1
                ORDER BY ime, priimek, id_clana;
            """)
            
            results = connection.execute(query)
            duplicate_records = results.fetchall()
            
            if duplicate_records:
                logger.info(f"\nFound duplicate entries at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}:")
                logger.info("-" * 100)

                current_group = None
                for record in duplicate_records:
                    if current_group != (record.ime, record.priimek):
                        if current_group is not None:
                            logger.info("-" * 100)
                        current_group = (record.ime, record.priimek)
                        logger.info(f"\nDuplicate Group for {record.ime} {record.priimek} ({record.group_count} entries):")
                    
                    logger.info(f"  ID: {record.id_clana}")
                    logger.info(f"  Email: {record.email}")
                    logger.info(f"  Phone: {record.telefon}")
                    logger.info(f"  Join Date: {record.datum_vclanitve if record.datum_vclanitve else 'Not available'}")
                    logger.info("")

                logger.info("-" * 100)
                logger.info(f"Total duplicate groups found: {len(set((r.ime, r.priimek) for r in duplicate_records))}")
                logger.info(f"Total duplicate records: {len(duplicate_records)}")

            else:
                logger.info("No duplicates found.")

    except Exception as e:
        logger.error(f"Error finding duplicates: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

def remove_duplicates():
    try:
        # Database connection setup
        hostname = "10.10.5.27"
        database = "KSSB_V2"
        username = "root"
        password = "tarcinakubik"
        engine = create_engine(f"mysql+pymysql://{username}:{password}@{hostname}/{database}")

        with engine.begin() as connection:
            # First find all duplicates with a single query
            query = text("""
                WITH duplicates AS (
                    SELECT 
                        c.id_clana,
                        c.ime,
                        c.priimek,
                        k.email,
                        k.telefon,
                        ROW_NUMBER() OVER (
                            PARTITION BY c.ime, c.priimek, k.email, k.telefon
                            ORDER BY c.id_clana
                        ) as row_num
                    FROM clani c
                    JOIN kontakti k ON c.id_clana = k.id_clana
                    WHERE k.email IS NOT NULL 
                    AND k.telefon IS NOT NULL
                )
                SELECT id_clana, ime, priimek, email, telefon
                FROM duplicates
                WHERE row_num > 1
                ORDER BY ime, priimek, id_clana;
            """)
            
            duplicate_records = connection.execute(query).fetchall()
            
            if duplicate_records:
                logger.info(f"\nRemoving {len(duplicate_records)} duplicate entries...")
                
                # Get list of IDs to remove
                duplicate_ids = [r.id_clana for r in duplicate_records]

                try:
                    # Save records that will be removed to CSV
                    df = pd.DataFrame(duplicate_records)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    csv_path = f"/home/database/KSSB_V2/removed_duplicates_{timestamp}.csv"
                    df.to_csv(csv_path, index=False)
                    logger.info(f"Records to be removed saved to: {csv_path}")
                except Exception as e:
                    logger.warning(f"Warning: Could not save records to CSV: {str(e)}")

                # Delete from all related tables in correct order
                tables = ['casovni_podatki', 'dokumenti', 'izobrazevanje', 'kontakti', 
                         'osebni_podatki', 'solsko_leto', 'clani']

                for table in tables:
                    try:
                        delete_query = text(f"DELETE FROM {table} WHERE id_clana IN :ids")
                        connection.execute(delete_query, {'ids': tuple(duplicate_ids)})
                        logger.info(f"Deleted records from {table}")
                    except Exception as e:
                        logger.error(f"Error deleting from {table}: {str(e)}")
                        raise

                logger.info("Successfully removed duplicate entries.")
            else:
                logger.info("No duplicates found to remove.")

    except Exception as e:
        logger.error(f"Error removing duplicates: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    find_duplicates() 