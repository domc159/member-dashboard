import pandas as pd
from sqlalchemy import create_engine, MetaData, Table, select, text
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
import logging
import sys

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), 'log')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'read_db_log.txt')

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

# Konfiguracija povezave z bazo
HOST = "10.10.5.27"
DATABASE = "KSSB_V2"
USER = "root"
PASSWORD = "tarcinakubik"
engine = create_engine(f"mysql+pymysql://{USER}:{PASSWORD}@{HOST}/{DATABASE}?charset=utf8mb4")
metadata = MetaData()

# Inicializacija aplikacije FastAPI
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#solsko_leto = '24/25'

def format_name_case(text):
    if not isinstance(text, str) or pd.isna(text):
        return text
    # Split on spaces and handle each word
    words = text.lower().split()
    # Capitalize first letter of each word
    words = [word.capitalize() for word in words]
    return ' '.join(words)

def read_all_tables(solsko_leto):
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result]
            combined_df = pd.DataFrame()
            
            for table_name in tables:
                query = f"SELECT * FROM {table_name}"
                df = pd.read_sql_query(query, connection)

                # Format name-related columns
                name_columns = ['ime', 'priimek', 'naslov', 'posta', 'kraj', 'ime_sole', 'naslov_sole']
                
                # First convert all string columns to lowercase
                for col in df.columns:
                    if pd.api.types.is_string_dtype(df[col]) and col not in name_columns:
                        df[col] = df[col].apply(lambda x: x.lower() if isinstance(x, str) else x)
                
                # Then apply proper capitalization to name-related columns
                for col in name_columns:
                    if col in df.columns:
                        df[col] = df[col].apply(format_name_case)
                
                # Convert datetime and date columns to strings to avoid overflow errors
                time_cols = [col for col in df.columns if 'datum_vclanitve' in col.lower() or 'date' in col.lower()]
                for col in time_cols:
                    if pd.api.types.is_datetime64_any_dtype(df[col]) or pd.api.types.is_object_dtype(df[col]):
                        try:
                            df[col] = pd.to_datetime(df[col], errors='coerce', format='%Y-%m-%d %H:%M:%S').astype(str)
                            df[col] = df[col].replace('NaT', None)
                        except Exception as e:
                            logger.error(f"Error converting column {col}: {e}")
                
                # Handle URL columns
                url_cols = [col for col in df.columns if 'url' in col.lower()]
                for col in url_cols:
                    if pd.api.types.is_object_dtype(df[col]):
                        try:
                            df[col] = df[col].apply(lambda x: 'https://kssb.datanexus.dev/pomanjanjepotrdila' if pd.isnull(x) else x)
                        except Exception as e:
                            logger.error(f"Error converting column {col}: {e}")
                
                # Set solsko_leto for empty or NULL fields in 'trenutno_leto' or 'zadnje_leto_vpisa'
                for col in ['trenutno_leto', 'zadnje_leto_vpisa']:
                    if col in df.columns:
                        df[col] = df[col].fillna(solsko_leto).replace('', solsko_leto)

                # Merge dataframes on 'id_clana'
                if 'id_clana' in df.columns:
                    if combined_df.empty:
                        combined_df = df
                    else:
                        combined_df = pd.merge(combined_df, df, on='id_clana', how='outer')

                else:
                    logger.info(f"Table {table_name} skipped (no 'id_clana' column).")
            
            combined_df = combined_df.where(pd.notnull(combined_df), None)

            return combined_df
        
    except Exception as e:
        logger.error(f"Error reading tables: {e}")
        return pd.DataFrame()

def full_export(solsko_leto):
    """API endpoint za pridobitev vseh podatkov iz baze v JSON formatu."""
    try:
        data = read_all_tables(solsko_leto)
        df_json = data.to_json(orient="records")
        parsed = json.loads(df_json)
        return parsed  # Return parsed JSON data instead of JSONResponse
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri izvozu podatkov: {str(e)}")

def active_member_export(solsko_leto):
    """API endpoint za pridobitev vseh podatkov iz baze v JSON formatu."""
    try:
        data = read_all_tables(solsko_leto)
        data = data[data.apply(lambda row: str(row['trenutno_leto']) == str(row['zadnje_leto_vpisa']), axis=1)]
        df_json = data.to_json(orient="records")
        parsed = json.loads(df_json)
        return parsed  # Return parsed JSON data instead of JSONResponse
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri izvozu podatkov: {str(e)}")