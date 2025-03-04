import pandas as pd
from sqlalchemy import create_engine, MetaData, Table, select, text
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from read_db import *
from datetime import date, datetime
import json
import uvicorn
import traceback
from sqlalchemy import insert, table, column
import os
from urllib.parse import unquote
import logging
import sys
import io

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), 'log')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'api-server_log.txt')

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

solsko_leto = '24/25'

# Add these near the top of the file, after imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = "/home/database/KSSB_V2/temp"
DOCS_BASE_DIR = "/home/database/KSSB_V2/dokumenti"
PRISTOPNA_DIR = os.path.join(DOCS_BASE_DIR, "pristopna_izjava")
POTRDILA_VPIS_DIR = os.path.join(DOCS_BASE_DIR, "potrdila_vpis")
POTRDILA_CLANSTVO_DIR = os.path.join(DOCS_BASE_DIR, "potrdila_clanstvo")

# Make sure temp directory exists at startup
os.makedirs(TEMP_DIR, exist_ok=True)

# Make sure directories exist
for dir_path in [DOCS_BASE_DIR, PRISTOPNA_DIR, POTRDILA_VPIS_DIR, POTRDILA_CLANSTVO_DIR]:
    os.makedirs(dir_path, exist_ok=True)

# Add these character mapping dictionaries near the top of the file, after the imports
sl_to_ascii = {
    'č': 'c',
    'š': 's',
    'ž': 'z',
    'ć': 'c',
    'đ': 'd',
    'Č': 'C',
    'Š': 'S',
    'Ž': 'Z',
    'Ć': 'C',
    'Đ': 'D'
}

ascii_to_sl = {
    'c': 'č',
    's': 'š',
    'z': 'ž',
    'C': 'Č',
    'S': 'Š',
    'Z': 'Ž'
}

@app.post("/api/search_result")
async def search_result(request: Request):
    try:
        logger.info("Starting search_result endpoint")
        
        # Preberi ID-je iz request body
        data = await request.json()
        member_ids = data.get('ids', [])
        logger.info(f"Received member_ids: {member_ids}")

        if not member_ids:
            logger.warning("No member IDs provided")
            raise HTTPException(status_code=400, detail="No member IDs provided")

        # Pridobi vse podatke iz baze
        logger.info("Fetching data from database...")
        all_data = full_export(solsko_leto)
        logger.info(f"Retrieved {len(all_data)} records from database")
        
        # Filtriraj podatke glede na prejete ID-je
        filtered_data = [row for row in all_data if row['id_clana'] in member_ids]
        logger.info(f"Filtered to {len(filtered_data)} records")

        if not filtered_data:
            logger.warning("No matching members found")
            raise HTTPException(status_code=404, detail="No matching members found")

        # Pretvori v DataFrame
        logger.info("Converting to DataFrame...")
        df = pd.DataFrame(filtered_data)
        
        # Ustvari Excel v pomnilniku
        logger.info("Creating Excel file in memory...")
        output = io.BytesIO()
        
        try:
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Izbrani člani')
            output.seek(0)
            excel_data = output.getvalue()
            logger.info("Excel file created successfully")
            
            return Response(
                content=excel_data,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={
                    'Content-Disposition': 'attachment; filename="izbrani_clani.xlsx"',
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            )
            
        except Exception as excel_error:
            logger.error(f"Error creating Excel file: {str(excel_error)}")
            raise HTTPException(status_code=500, detail=f"Error creating Excel file: {str(excel_error)}")

    except Exception as e:
        logger.error(f"Error in search_result: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing data: {str(e)}")

@app.get("/download/izbrani_clani")
async def download_izbrani_clani():
    """API endpoint za prenos Excel datoteke izbranih članov."""
    try:
        # Redirect to search_result if no data is available
        raise HTTPException(
            status_code=400, 
            detail="Please use the search function to select members first"
        )
    except Exception as e:
        logger.error(f"Error in download_izbrani_clani: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/aktivni_clani")
async def download_aktivni_clani(solsko_leto: str = '24/25'):
    """API endpoint za prenos Excel datoteke aktivnih članov."""
    try:
        # Pridobi podatke aktivnih članov
        data = active_member_export(solsko_leto)
        
        # Pretvori podatke v DataFrame
        df = pd.DataFrame(data)
        
        # Ustvari Excel v pomnilniku
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Aktivni člani')
        output.seek(0)
        
        # Vrni Excel kot prenos
        headers = {
            'Content-Disposition': 'attachment; filename="aktivni_clani.xlsx"'
        }
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
    except Exception as e:
        logger.error(f"Error in download_aktivni_clani: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trenutni_clani")
async def get_trenutni_clani():
    """API endpoint za pridobivanje trenutnih članov."""
    try:
        logger.info("Fetching current members")
        data = active_member_export(solsko_leto)
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching current members: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fullexport")
async def get_full_export():
    """API endpoint za pridobivanje vseh članov."""
    try:
        logger.info("Fetching full export")
        data = full_export(solsko_leto)
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching full export: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/novclan")
async def add_new_member(request: Request):
    try:
        data = await request.json()
        logger.info("=== NOVCLAN PODATKI NA STREŽNIKU ===")
        logger.info(data)
        
        # Pretvori polja z datumi v ustrezen format
        date_fields = ["datum_vclanitve", "datum_rojstva", "processed_date"]
        for f in date_fields:
            if f in data and data[f]:
                data[f] = pd.to_datetime(data[f]).strftime("%Y-%m-%d %H:%M:%S")
        
        with engine.begin() as connection:
            # 1) Vnos v clani
            clani_table = table("clani", column("ime"), column("priimek"))
            clani_stmt = insert(clani_table).values(ime=data["ime"], priimek=data["priimek"])
            result = connection.execute(clani_stmt)
            id_clana = result.inserted_primary_key[0] if result.inserted_primary_key else result.lastrowid

            # 2) Vnos v osebni_podatki
            osebni_podatki_table = table(
                "osebni_podatki",
                column("id_clana"), column("naslov"), column("posta"),
                column("postna_stevilka"), column("datum_rojstva")
            )
            osebni_podatki_stmt = insert(osebni_podatki_table).values(
                id_clana=id_clana,
                naslov=data["naslov"],
                posta=data["posta"],
                postna_stevilka=data["postna_stevilka"],
                datum_rojstva=data["datum_rojstva"]
            )
            connection.execute(osebni_podatki_stmt)

            # 3) Vnos v kontakti
            kontakti_table = table("kontakti", column("id_clana"), column("email"), column("telefon"))
            kontakti_stmt = insert(kontakti_table).values(
                id_clana=id_clana,
                email=data["email"],
                telefon=data["telefon"]
            )
            connection.execute(kontakti_stmt)

            # 4) Vnos v izobrazevanje
            izobrazevanje_table = table(
                "izobrazevanje",
                column("id_clana"), column("fakulteta"), column("studijski_program"),
                column("letnik"), column("status")
            )
            izobrazevanje_stmt = insert(izobrazevanje_table).values(
                id_clana=id_clana,
                fakulteta=data["fakulteta"],
                studijski_program=data["studijski_program"],
                letnik=data["letnik"],
                status=data["status"]
            )
            connection.execute(izobrazevanje_stmt)

            # 5) Vnos v dokumenti
            dokumenti_table = table(
                "dokumenti",
                column("id_clana"), column("potrdilo_url"), column("vpis_url"), column("clansko_potrdilo_url")
            )
            dokumenti_stmt = insert(dokumenti_table).values(
                id_clana=id_clana,
                potrdilo_url=data["potrdilo_url"] if "potrdilo_url" in data else None,
                vpis_url=data["vpis_url"] if "vpis_url" in data else None,
                clansko_potrdilo_url=data["clansko_potrdilo_url"] if "clansko_potrdilo_url" in data else None
            )
            connection.execute(dokumenti_stmt)

            # 6) Vnos v solsko_leto
            solsko_leto_table = table("solsko_leto", column("id_clana"), column("trenutno_leto"), column("zadnje_leto_vpisa"))
            solsko_leto_stmt = insert(solsko_leto_table).values(
                id_clana=id_clana,
                trenutno_leto= "24/25",
                #zadnje_leto_vpisa= "24/25",
                #trenutno_leto=data["24/25"],
                zadnje_leto_vpisa=data["trenutno_leto"]
            )
            connection.execute(solsko_leto_stmt)

            # 7) Vnos v casovni_podatki
            casovni_podatki_table = table(
                "casovni_podatki",
                column("id_clana"), column("datum_vclanitve"), column("processed_date")
            )
            casovni_podatki_stmt = insert(casovni_podatki_table).values(
                id_clana=id_clana,
                datum_vclanitve=data["datum_vclanitve"],
                processed_date=data["processed_date"]
            )
            connection.execute(casovni_podatki_stmt)

        return JSONResponse(content={"message": "Član uspešno dodan", "status": "success"})

    except Exception as e:
        logger.error("CHYTENI IZJEM:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Napaka pri dodajanju člana: {str(e)}")

@app.post("/api/izbris")
async def izbrisi_clana(request: Request):
    try:
        data = await request.json()
        id_clana = data.get('id_clana')
        
        if not id_clana:
            raise HTTPException(status_code=400, detail="Manjka ID člana")

        with engine.connect() as connection:
            # Delete in specific order to respect foreign key constraints
            # First delete from child tables
            delete_queries = [
                "DELETE FROM dokumenti WHERE id_clana = :id",
                "DELETE FROM izobrazevanje WHERE id_clana = :id",
                "DELETE FROM kontakti WHERE id_clana = :id",
                "DELETE FROM osebni_podatki WHERE id_clana = :id",
                "DELETE FROM casovni_podatki WHERE id_clana = :id",
                "DELETE FROM solsko_leto WHERE id_clana = :id",
                # Finally delete from the parent table
                "DELETE FROM clani WHERE id_clana = :id"
            ]
            
            for query in delete_queries:
                connection.execute(text(query), {"id": id_clana})
                connection.commit()

        return JSONResponse(content={"message": "Član uspešno izbrisan", "status": "success"})

    except Exception as e:
        logger.error("Napaka pri brisanju:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Napaka pri brisanju člana: {str(e)}")

@app.post("/api/posodobiclana")
async def posodobi_clana(request: Request):
    """API endpoint za posodobitev podatkov člana."""
    try:
        data = await request.json()
        id_clana = data.get('id_clana')
        
        if not id_clana:
            raise HTTPException(status_code=400, detail="Manjka ID člana")

        with engine.begin() as connection:
            # Update clani table
            clani_update = text("""
                UPDATE clani 
                SET ime = :ime, priimek = :priimek 
                WHERE id_clana = :id_clana
            """)
            connection.execute(clani_update, {
                'ime': data['ime'],
                'priimek': data['priimek'],
                'id_clana': id_clana
            })

            # Update osebni_podatki table
            osebni_podatki_update = text("""
                UPDATE osebni_podatki 
                SET naslov = :naslov, posta = :posta, postna_stevilka = :postna_stevilka
                WHERE id_clana = :id_clana
            """)
            connection.execute(osebni_podatki_update, {
                'naslov': data['naslov'],
                'posta': data['posta'],
                'postna_stevilka': data['postna_stevilka'],
                'id_clana': id_clana
            })

            # Update kontakti table
            kontakti_update = text("""
                UPDATE kontakti 
                SET email = :email, telefon = :telefon
                WHERE id_clana = :id_clana
            """)
            connection.execute(kontakti_update, {
                'email': data['email'],
                'telefon': data['telefon'],
                'id_clana': id_clana
            })

            # Update izobrazevanje table
            izobrazevanje_update = text("""
                UPDATE izobrazevanje 
                SET fakulteta = :fakulteta, studijski_program = :studijski_program,
                    letnik = :letnik, status = :status
                WHERE id_clana = :id_clana
            """)
            connection.execute(izobrazevanje_update, {
                'fakulteta': data['fakulteta'],
                'studijski_program': data['studijski_program'],
                'letnik': data['letnik'],
                'status': data['status'],
                'id_clana': id_clana
            })

        return JSONResponse(content={"message": "Podatki člana uspešno posodobljeni", "status": "success"})

    except Exception as e:
        logger.error("Napaka pri posodabljanju:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Napaka pri posodabljanju člana: {str(e)}")

@app.post("/api/dailytask")
async def save_daily_tasks(request: Request):
    """API endpoint for saving daily tasks to MySQL database."""
    try:
        data = await request.json()
        date_id = data.get('id_tabele')
        
        if not date_id:
            raise HTTPException(status_code=400, detail="Missing id_tabele")

        # Create DataFrame for the main Tasklist table
        tasklist_df = pd.DataFrame([{
            'date': date_id
        }])

        # Try to insert into Tasklist table, if exists update
        try:
            tasklist_df.to_sql('Tasklist', engine, if_exists='append', index=False)
        except Exception as e:
            # If date already exists, we can continue
            logger.info(f"Table entry might already exist: {str(e)}")

        # Get the table_id for the date
        query = f"SELECT id FROM Tasklist WHERE date = '{date_id}'"
        table_id = pd.read_sql_query(query, engine).iloc[0]['id']

        # Create dynamic table name for tasks
        task_table_name = f"Task_{date_id.replace('-', '_')}"

        # Create the task table if it doesn't exist
        create_task_table_query = f"""
        CREATE TABLE IF NOT EXISTS {task_table_name} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            table_id INT NOT NULL,
            content VARCHAR(250) NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (table_id) REFERENCES Tasklist(id) ON DELETE CASCADE
        )
        """
        with engine.connect() as connection:
            connection.execute(text(create_task_table_query))
            connection.commit()

        # Extract tasks and their status from the request data
        tasks_data = []
        i = 1
        while f'task{i}' in data:
            tasks_data.append({
                'table_id': table_id,
                'content': data[f'task{i}'],
                'completed': data[f'status{i}']
            })
            i += 1

        if tasks_data:
            # Create DataFrame for tasks
            tasks_df = pd.DataFrame(tasks_data)

            # Delete existing tasks for this table_id
            delete_query = f"DELETE FROM {task_table_name} WHERE table_id = {table_id}"
            with engine.connect() as connection:
                connection.execute(text(delete_query))
                connection.commit()

            # Insert new tasks
            tasks_df.to_sql(task_table_name, engine, if_exists='append', index=False)

        return JSONResponse(content={"message": "Tasks saved successfully", "status": "success"})

    except Exception as e:
        logger.error("Error saving tasks:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving tasks: {str(e)}")

@app.get("/api/tasksynch")
async def sync_tasks():
    """API endpoint for syncing all tasks from database."""
    try:
        # First, check which task tables actually exist
        existing_tables_query = text("""
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'KSSB_V2'
        AND TABLE_NAME LIKE 'Task_%'
        """)
        existing_tables_df = pd.read_sql_query(existing_tables_query, engine)
        existing_tables = set(existing_tables_df['TABLE_NAME'].tolist())

        # Get all tables from Tasklist
        tasklist_query = text("SELECT id, date FROM Tasklist")
        tasklist_df = pd.read_sql_query(tasklist_query, engine)
        
        # Keep track of tables to delete
        tables_to_delete = []
        result = []
        
        # For each table, get its tasks
        for _, row in tasklist_df.iterrows():
            table_id = row['id']
            date = row['date'].strftime('%Y-%m-%d')
            task_table_name = f"Task_{date.replace('-', '_')}"
            
            # Check if the task table exists
            if task_table_name not in existing_tables:
                tables_to_delete.append(table_id)
                continue
            
            task_query = text(f"""
                SELECT content, completed
                FROM {task_table_name}
                WHERE table_id = :table_id
                ORDER BY id
            """)
            
            try:
                tasks_df = pd.read_sql_query(task_query, engine, params={'table_id': table_id})
                
                # Convert tasks to list format
                tasks = []
                for _, task_row in tasks_df.iterrows():
                    tasks.append({
                        'id': f"{date}-{len(tasks) + 1}",
                        'content': task_row['content'],
                        'completed': bool(task_row['completed'])
                    })
                
                # Add empty task row at the end for the "add new" functionality
                tasks.append({
                    'id': f"{date}-{len(tasks) + 1}",
                    'content': '',
                    'completed': False
                })
                
                # Add this table to result
                result.append({
                    'date': date,
                    'tasks': tasks
                })
                
            except Exception as e:
                logger.error(f"Error getting tasks for date {date}: {str(e)}")
                tables_to_delete.append(table_id)
                continue
        
        # Clean up Tasklist by removing entries for non-existent task tables
        if tables_to_delete:
            # Convert list to comma-separated string for SQL IN clause
            ids_string = ','.join(str(id) for id in tables_to_delete)
            delete_query = text(f"DELETE FROM Tasklist WHERE id IN ({ids_string})")
            with engine.connect() as connection:
                connection.execute(delete_query)
                connection.commit()
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error("Error syncing tasks:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error syncing tasks: {str(e)}")

@app.get("/dokumenti/{document_type}/{filename}")
async def get_document(document_type: str, filename: str):
    try:
        # Extract filename from full URL if needed and decode URL-encoded characters
        if '/' in filename:
            filename = filename.split('/')[-1]
        filename = unquote(filename)
        
        # Map document types to directories
        dir_mapping = {
            'pristopna_izjava': PRISTOPNA_DIR,
            'potrdila_vpis': POTRDILA_VPIS_DIR,
            'potrdila_clanstvo': POTRDILA_CLANSTVO_DIR,
            'eservis': os.path.join(DOCS_BASE_DIR, "eservis")
        }
        
        base_dir = dir_mapping.get(document_type)
        if not base_dir:
            raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type}")
            
        # Get clean filename parts
        clean_filename = filename.replace('.pdf', '').lower()
        name_parts = clean_filename.split('_')[:2]  # Get first two parts (ime and priimek)
        
        # Create possible name patterns
        possible_names = []
        
        # Original order (ime_priimek)
        ime, priimek = name_parts
        
        # Add patterns based on document type
        if document_type == 'eservis':
            possible_names.extend([
                f"{priimek}_{ime}_eservis_prijavnica",
                f"{''.join(ascii_to_sl.get(c, c) for c in priimek)}_{''.join(ascii_to_sl.get(c, c) for c in ime)}_eservis_prijavnica",
                f"{ime}_{priimek}_eservis_prijavnica",
                f"{''.join(ascii_to_sl.get(c, c) for c in ime)}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}_eservis_prijavnica"
            ])
        else:
            possible_names.extend([
                f"pristopna_izjava_{ime}_{priimek}",
                f"pristopna_izjava_{ime}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}",
                f"pristopna_izjava_{''.join(ascii_to_sl.get(c, c) for c in ime)}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}"
            ])
            if document_type == 'potrdila_vpis':
                possible_names.extend([
                    f"{ime}_{priimek}_potrdilo_solanje",
                    f"{ime}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}_potrdilo_solanje",
                    f"{''.join(ascii_to_sl.get(c, c) for c in ime)}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}_potrdilo_solanje"
                ])
            elif document_type == 'potrdila_clanstvo':
                possible_names.extend([
                    f"{ime}_{priimek}_potrdilo_o_clanstvu",
                    f"{ime}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}_potrdilo_o_clanstvu",
                    f"{''.join(ascii_to_sl.get(c, c) for c in ime)}_{''.join(ascii_to_sl.get(c, c) for c in priimek)}_potrdilo_o_clanstvu"
                ])

        # Get list of files in directory
        files = os.listdir(base_dir)
        
        # Log debugging information
        logger.info(f"Attempted name patterns: {possible_names}")
        logger.info(f"Available files: {files}")
        
        # Find matching file
        matching_file = None
        for pattern in possible_names:
            for file in files:
                file_without_ext = file.replace('.pdf', '').lower()
                if file_without_ext == pattern:
                    matching_file = file
                    break
            if matching_file:
                break
                
        if not matching_file:
            logger.error(f"Attempted name patterns: {possible_names}")
            logger.error(f"Available files: {files}")
            raise HTTPException(status_code=404, detail=f"Document not found: {filename}")

        file_path = os.path.join(base_dir, matching_file)
        logger.info(f"Found matching file: {file_path}")

        # Convert the matching filename to ASCII for headers
        ascii_filename = matching_file
        for sl_char, ascii_char in sl_to_ascii.items():
            ascii_filename = ascii_filename.replace(sl_char, ascii_char)
            
        return FileResponse(
            file_path, 
            media_type="application/pdf",
            filename=ascii_filename,  # Use ASCII filename for Content-Disposition
            headers={
                "Content-Disposition": f"attachment; filename={ascii_filename}",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        logger.error(f"Error serving file {filename}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Zagon aplikacije za razvoj
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
