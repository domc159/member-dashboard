import pandas as pd 
from sqlalchemy import create_engine, text, table, column, insert
from fastapi import FastAPI, WebSocket, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Any
import io
from fastapi.responses import FileResponse, Response, JSONResponse
import plotly.graph_objects as go
import os
import requests
from pdf import generate_pdf_certificate
import zipfile

last_search_results = pd.DataFrame({
    'Ime': [''],
    'Priimek': [''],
    'Naslov': [''],
    'Poštna številka': [''],
    'Pošta': [''],
    'Izobraževalni porogram': [''],
    'Letnik': [''],
    'Ustanova': [''],
    'Status': [''],
    'Datum rojstva': [''],
    'E-naslov': [''],
    'Tel. številka': ['']
})
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing purposes
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

hostname = "10.10.5.27"
database = "KSSB_V2"    
username = "root"
password = "tarcinakubik"
engine = create_engine("mysql+pymysql://{user}:{pw}@{host}/{db}?charset=utf8mb4".format(
    host=hostname, db=database, user=username, pw=password))


def read_database(table_name):
    try:
        query = f"SELECT * FROM {table_name}"
        df = pd.read_sql(query, con=engine)
        return df
    except Exception as e:
        print(f"Error reading data for {table_name}: {str(e)}")
        return None
    
@app.get("/api/barday/")
async def barday():
    try:
        query = "SELECT datum_vclanitve FROM casovni_podatki"
        df = pd.read_sql(query, con=engine)
        df['datum_vclanitve'] = pd.to_datetime(df['datum_vclanitve'], errors='coerce').dropna()
        df['day'], df['month'], df['year'] = df['datum_vclanitve'].dt.day, df['datum_vclanitve'].dt.month, df['datum_vclanitve'].dt.year
        daily_counts = df.groupby(['year', 'month', 'day']).size().reset_index(name='count')
        years = sorted(daily_counts['year'].unique())
        fig = go.Figure()
        days_in_month = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
        month_names = {1: 'Januar', 2: 'Februar', 3: 'Marec', 4: 'April', 5: 'Maj', 6: 'Junij', 7: 'Julij', 8: 'Avgust', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'December'}
        
        for year in years:
            for month in range(1, 13):
                month_data = daily_counts[(daily_counts['year'] == year) & (daily_counts['month'] == month)]
                all_days = pd.DataFrame({'day': range(1, days_in_month[month] + 1)})
                month_data = all_days.merge(month_data, on='day', how='left').fillna(0)
                fig.add_trace(go.Bar(x=month_data['day'], y=month_data['count'], name=f"{month_names[month]} {year}", marker_color='#d1995c', visible=(year == years[0] and month == 1)))
        
        year_buttons = [dict(label=str(year), method='update', args=[{'visible': [trace.name.endswith(str(year)) for trace in fig.data]}]) for year in years]
        month_buttons = [dict(label=month_names[i], method='update', args=[{'visible': [trace.name.startswith(month_names[i]) for trace in fig.data]}]) for i in range(1, 13)]
        
        fig.update_layout(
            updatemenus=[
                dict(buttons=year_buttons, direction='down', showactive=True, x=0.81, y=1.15),
                dict(buttons=month_buttons, direction='down', showactive=True, x=0.9, y=1.15)
            ],
            title='Dnevno mesečne včlanitve',
            xaxis_title=None,
            yaxis_title=None,
            plot_bgcolor='#252729',
            paper_bgcolor='#252729',
            font={'color': '#E4D7CA'},
            autosize=True,
            showlegend=False,
            width=1750  # Set the width to 100%
        )
        fig.update_xaxes(gridcolor='#414344', showgrid=True, dtick=1)
        fig.update_yaxes(gridcolor='#414344', showgrid=True)
        
        return JSONResponse(content=fig.to_json())
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/api/barmonth/")
async def barmonth():
    try:
        query = "SELECT datum_vclanitve FROM casovni_podatki"
        df = pd.read_sql(query, con=engine)
        df['datum_vclanitve'] = pd.to_datetime(df['datum_vclanitve'], errors='coerce').dropna()
        df['month'], df['year'] = df['datum_vclanitve'].dt.month, df['datum_vclanitve'].dt.year
        years = sorted(df['year'].unique())
        current_year = pd.Timestamp.now().year
        fig = go.Figure()
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        for year in years:
            monthly_counts = df[df['year'] == year]['month'].value_counts().reindex(range(1, 13), fill_value=0)
            fig.add_trace(go.Bar(x=month_names, y=monthly_counts.values, name=str(year), marker_color='#d1995c', visible=(year == current_year)))
        
        buttons = [dict(label=str(year), method='update', args=[{'visible': [trace.name == str(year) for trace in fig.data]}, {'title': f"Včlanitve na mesec - {year}"}]) for year in years]
        
        fig.update_layout(
            updatemenus=[
                dict(buttons=buttons, 
                     direction='down', 
                     showactive=True,
                     x=0.9, y=1.15)],
                title=f"Včlanitve na mesec",
                xaxis_title=None, 
                yaxis_title=None, 
                plot_bgcolor='#252729',
                paper_bgcolor='#252729', 
                font={'color': '#E4D7CA'}, 
                autosize=True,             
                width=1750  # Set the width to 100%
)
        fig.update_xaxes(gridcolor='#414344', showgrid=True)
        fig.update_yaxes(gridcolor='#414344', showgrid=True)
        
        return JSONResponse(content=fig.to_json())
    except Exception as e:
        return {"error": str(e)}


@app.get("/download/clani/")
async def download_clani():
    try:
        df_clani = read_database("clani")
        df_osebni_podatki = read_database("osebni_podatki")
        df_kontakti = read_database("kontakti")
        df_izobrazevanje = read_database("izobrazevanje")
        df_dokumenti = read_database("dokumenti")
        df_solsko_leto = read_database("solsko_leto")
        df_casovni_podatki = read_database("casovni_podatki")
        
        if all(df is not None for df in [df_clani, df_osebni_podatki, df_kontakti, df_izobrazevanje, df_dokumenti, df_solsko_leto, df_casovni_podatki]):
            df = df_clani.merge(df_osebni_podatki, on='id_clana')\
                         .merge(df_kontakti, on='id_clana')\
                         .merge(df_izobrazevanje, on='id_clana')\
                         .merge(df_dokumenti, on='id_clana')\
                         .merge(df_solsko_leto, on='id_clana')\
                         .merge(df_casovni_podatki, on='id_clana')
            # Convert DataFrame to CSV string with semicolon delimiter and UTF-8-SIG encoding
            csv_string = df.to_csv(index=False, sep=';', encoding='utf-8-sig')
            
            # Create response with CSV content and UTF-8 encoding with BOM
            return Response(
                content=csv_string.encode('utf-8-sig'),
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": "attachment; filename=clani.csv"
                }
            )
        return {"error": "No data found"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/download/search/")
async def download_search_results():
    try:
        if last_search_results is not None and not last_search_results.empty:
            # Convert DataFrame to CSV string with semicolon delimiter and UTF-8 encoding
            csv_string = last_search_results.to_csv(index=False, sep=';', encoding='utf-8-sig')
            return Response(
                content=csv_string.encode('utf-8-sig'),
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": "attachment; filename=iskanje.csv"
                }
            )
        return {"error": "No search results available"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/clani/")
async def get_clani():
    try:
        print("API endpoint accessed.")
        df_clani = read_database("clani")
        df_osebni_podatki = read_database("osebni_podatki")
        df_kontakti = read_database("kontakti")
        df_izobrazevanje = read_database("izobrazevanje")
        df_dokumenti = read_database("dokumenti")
        df_solsko_leto = read_database("solsko_leto")
        df_casovni_podatki = read_database("casovni_podatki")
        
        if all(df is not None for df in [df_clani, df_osebni_podatki, df_kontakti, df_izobrazevanje, df_dokumenti, df_solsko_leto, df_casovni_podatki]):
            df = df_clani.merge(df_osebni_podatki, on='id_clana')\
                         .merge(df_kontakti, on='id_clana')\
                         .merge(df_izobrazevanje, on='id_clana')\
                         .merge(df_dokumenti, on='id_clana')\
                         .merge(df_solsko_leto, on='id_clana')\
                         .merge(df_casovni_podatki, on='id_clana')
            print("Data read from database.")
            all_records = df.to_dict('records')
            return all_records
        else:
            print("One or more tables are empty or don't exist.")
            return {"error": "No data found"}
    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search/")
async def search(data: Any = Body(None)):
    global last_search_results
    try:
        search_value = data.get('query', '').lower()
        df_clani = read_database("clani")
        df_osebni_podatki = read_database("osebni_podatki")
        df_kontakti = read_database("kontakti")
        df_izobrazevanje = read_database("izobrazevanje")
        
        if all(df is not None for df in [df_clani, df_osebni_podatki, df_kontakti, df_izobrazevanje]):
            df = df_clani.merge(df_osebni_podatki, on='id_clana')\
                         .merge(df_kontakti, on='id_clana')\
                         .merge(df_izobrazevanje, on='id_clana')
            # Exclude specific columns from the search
            exclude_columns = ['datum_vclanitve', 'datum_rojstva']
            string_columns = df.select_dtypes(include=['object']).columns
            string_columns = [col for col in string_columns if col not in exclude_columns]
            
            mask = pd.Series(False, index=df.index)
            for col in string_columns:
                mask |= df[col].astype(str).str.lower().str.contains(search_value, na=False)
            
            matching_rows = df[mask]
            if not matching_rows.empty:
                last_search_results = matching_rows  # Store the search results
                return matching_rows.to_dict('records')
            else:
                last_search_results = pd.DataFrame()  # Clear the search results
                return []
        else:
            return []
    except Exception as e:
        print(f"Error in search endpoint: {str(e)}")
        return {"error": str(e)}

@app.post("/api/izbris/")
async def izbris(data: Any = Body(None)):
    try:
        # Get email from request data
        email = data.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        # Read database table
        df_kontakti = read_database("kontakti")
        if df_kontakti is None:
            raise HTTPException(status_code=500, detail="Error reading database")

        print("Available columns:", df_kontakti.columns.tolist())  # Debug print
        
        # Find rows with matching email and delete them
        column_name = 'email'  # Adjust this if the actual column name is different
        if column_name not in df_kontakti.columns:
            raise HTTPException(status_code=500, detail=f"Column {column_name} not found in database")
            
        df_kontakti = df_kontakti[df_kontakti[column_name] != email]
        
        # Write back to database
        df_kontakti.to_sql('kontakti', con=engine, if_exists='replace', index=False)
        
        return {"status": "success", "message": f"Records with email {email} deleted successfully"}
    except Exception as e:
        print(f"Error deleting data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting data: {str(e)}")

@app.post("/api/izbiraclana")
async def izbiraclana(data: Any = Body(None)):
    try:
        first_name = data.get('firstName', '').lower()
        last_name = data.get('lastName', '').lower()
        df_clani = read_database("clani")
        df_osebni_podatki = read_database("osebni_podatki")
        df_kontakti = read_database("kontakti")
        df_izobrazevanje = read_database("izobrazevanje")
        
        if all(df is not None for df in [df_clani, df_osebni_podatki, df_kontakti, df_izobrazevanje]):
            df = df_clani.merge(df_osebni_podatki, on='id_clana')\
                         .merge(df_kontakti, on='id_clana')\
                         .merge(df_izobrazevanje, on='id_clana')
            matching_row = df[(df['ime'].str.lower() == first_name) & (df['priimek'].str.lower() == last_name)]
            if not matching_row.empty:
                return matching_row.iloc[0].to_dict()
            else:
                return {"error": "Member not found"}
        else:
            return {"error": "Error reading database"}
    except Exception as e:
        print(f"Error in izbiraclana endpoint: {str(e)}")
        return {"error": str(e)}

@app.post("/api/updateclana")
async def updateclana(data: Any = Body(None)):
    try:
        # Nastavi privzeto vrednost za manjkajoče podatke
        def get_value(key, default="/"):
            return data.get(key, default) if data.get(key) is not None else default

        # Preberi trenutne podatke člana iz baze
        ime = get_value("ime")
        priimek = get_value("priimek")
        df_clani = read_database("clani")
        df_osebni_podatki = read_database("osebni_podatki")
        df_kontakti = read_database("kontakti")
        df_izobrazevanje = read_database("izobrazevanje")
        df_dokumenti = read_database("dokumenti")
        df_solsko_leto = read_database("solsko_leto")
        df_casovni_podatki = read_database("casovni_podatki")

        if all(df is not None for df in [df_clani, df_osebni_podatki, df_kontakti, df_izobrazevanje, df_dokumenti, df_solsko_leto, df_casovni_podatki]):
            df = df_clani.merge(df_osebni_podatki, on='id_clana')\
                         .merge(df_kontakti, on='id_clana')\
                         .merge(df_izobrazevanje, on='id_clana')\
                         .merge(df_dokumenti, on='id_clana')\
                         .merge(df_solsko_leto, on='id_clana')\
                         .merge(df_casovni_podatki, on='id_clana')
            matching_row = df[(df['ime'].str.lower() == ime.lower()) & (df['priimek'].str.lower() == priimek.lower())]
            if matching_row.empty:
                return {"error": "Member not found"}

            id_clana = matching_row.iloc[0]['id_clana']

            # Posodobi vrednosti samo za spremenjene podatke
            updates = {}
            for key in data.keys():
                if key in matching_row.columns and data[key] != matching_row.iloc[0][key]:
                    updates[key] = data[key]

            if updates:
                for table_name, df_table in [("clani", df_clani), ("osebni_podatki", df_osebni_podatki), ("kontakti", df_kontakti), ("izobrazevanje", df_izobrazevanje), ("dokumenti", df_dokumenti), ("solsko_leto", df_solsko_leto), ("casovni_podatki", df_casovni_podatki)]:
                    if any(col in updates for col in df_table.columns):
                        df_table.loc[df_table['id_clana'] == id_clana, updates.keys()] = updates.values()
                        df_table.to_sql(table_name, con=engine, if_exists="replace", index=False)

            return {"status": "success", "message": f"Član z ID {id_clana} je bil uspešno posodobljen."}
        else:
            return {"error": "Error reading database"}
    except Exception as e:
        print(f"Napaka pri posodabljanju člana: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Napaka pri posodabljanju člana: {str(e)}")

@app.get("/api/test_sqlalchemy")
async def test_sqlalchemy():
    try:
        query = text("SELECT 1")
        with engine.connect() as connection:
            result = connection.execute(query).fetchone()
            return {"result": result[0]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/results/")
async def get_search_results():
    try:
        if last_search_results is not None and not last_search_results.empty:
            return last_search_results.to_dict('records')
        return {"error": "No search results available"}
    except Exception as e:
        print(f"Error in get_search_results endpoint: {str(e)}")
        return {"error": str(e)}

@app.get("/uploads/{last_name}_{first_name}.pdf")
async def download_pdf(last_name: str, first_name: str):
    try:
        # Construct the file path
        file_name = f"{last_name.lower()}_{first_name.lower()}.pdf"
        file_path = os.path.join("/home/database/uploads", file_name)
        
        # Check if the file exists
        if (os.path.exists(file_path)):
            return FileResponse(file_path, media_type='application/pdf', filename=file_name)
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/potrdila/{first_name}_{last_name}_potrdilo.pdf")
async def download_potrdilo_pdf(first_name: str, last_name: str):
    try:
        # Construct the file path
        file_name = f"{first_name.lower()}_{last_name.lower()}_potrdilo.pdf"
        file_path = os.path.join("/home/database/pdf", file_name)
        
        # Check if the file exists
        if os.path.exists(file_path):
            return FileResponse(file_path, media_type='application/pdf', filename=file_name)
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/novclan/")
async def save_new_member(data: Any = Body(None)):
    try:
        # Log the received data
        print(f"Received data: {data}")

        # Read id_clana from the request data
        id_clana = data['id_clana']
        print(f"ID clana: {id_clana}")

        # Save new member data to all relevant tables
        df_clani = pd.DataFrame([{
            'id_clana': id_clana,
            'ime': data['ime'],
            'priimek': data['priimek']
        }])
        df_clani.to_sql("clani", con=engine, if_exists="append", index=False)

        df_osebni_podatki = pd.DataFrame([{
            'id_clana': id_clana,
            'naslov': data['naslov'],
            'posta': data['posta'],
            'postna_stevilka': data['postna_stevilka'],
            'datum_rojstva': data['datum_rojstva']
        }])
        df_osebni_podatki.to_sql("osebni_podatki", con=engine, if_exists="append", index=False)

        df_kontakti = pd.DataFrame([{
            'id_clana': id_clana,
            'email': data['email'],
            'telefon': data['telefon']
        }])
        df_kontakti.to_sql("kontakti", con=engine, if_exists="append", index=False)

        df_izobrazevanje = pd.DataFrame([{
            'id_clana': id_clana,
            'fakulteta': data['fakulteta'],
            'studijski_program': data['studijski_program'],
            'letnik': data['letnik'],
            'status': data['status']
        }])
        df_izobrazevanje.to_sql("izobrazevanje", con=engine, if_exists="append", index=False)

        df_dokumenti = pd.DataFrame([{
            'id_clana': id_clana,
            'potrdilo_url': data.get('potrdilo_url'),
            'vpis_url': data.get('vpis_url'),
            'clansko_potrdilo_url': data.get('clansko_potrdilo_url')
        }])
        df_dokumenti.to_sql("dokumenti", con=engine, if_exists="append", index=False)

        df_solsko_leto = pd.DataFrame([{
            'id_clana': id_clana,
            'leto_24_25': data.get('leto_24_25', True)
        }])
        df_solsko_leto.to_sql("solsko_leto", con=engine, if_exists="append", index=False)

        df_casovni_podatki = pd.DataFrame([{
            'id_clana': id_clana,
            'datum_vclanitve': data['datum_vclanitve'],
            'processed_date': pd.Timestamp.now()
        }])
        df_casovni_podatki.to_sql("casovni_podatki", con=engine, if_exists="append", index=False)

        # Print the API data to the console
        print(f"New member data: {data}")

        return {"status": "success", "message": "New member data saved successfully", "id_clana": id_clana}
    except Exception as e:
        print(f"Error saving data to database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving data to database: {str(e)}")
@app.get("/api/selectexport/")
async def select_export():
    try:
        df = read_database("clani")
        if df is not None:
            names = df[['ime', 'priimek']].apply(lambda row: f"{row['ime']} {row['priimek']}", axis=1).tolist()
            return names
        return {"error": "No data found"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/selectedones/")
async def selected_ones(data: Any = Body(None)):
    try:
        selected_names = data.get('selectedNodes', [])
        export_clani = data.get('clani', False)
        export_vpisni_list = data.get('vpisni_list', False)
        export_potrdilo = data.get('potrdilo', False)

        # Split selected names into first name and last name
        selected_names_split = [name.split() for name in selected_names]

        # Create a zip file to store the exported files
        zip_filename = "exported_files.zip"
        combined_csv_data = pd.DataFrame()

        with zipfile.ZipFile(zip_filename, 'w') as zipf:
            for name in selected_names_split:
                if len(name) != 2:
                    continue
                first_name, last_name = name

                # Ensure names are handled as UTF-8
                first_name = first_name.encode('utf-8').decode('utf-8')
                last_name = last_name.encode('utf-8').decode('utf-8')

                # Export clani
                if export_clani:
                    df_clani = read_database("clani")
                    df_osebni_podatki = read_database("osebni_podatki")
                    df_kontakti = read_database("kontakti")
                    df_izobrazevanje = read_database("izobrazevanje")
                    df_dokumenti = read_database("dokumenti")
                    df_solsko_leto = read_database("solsko_leto")
                    df_casovni_podatki = read_database("casovni_podatki")
                    
                    if all(df is not None for df in [df_clani, df_osebni_podatki, df_kontakti, df_izobrazevanje, df_dokumenti, df_solsko_leto, df_casovni_podatki]):
                        df = df_clani.merge(df_osebni_podatki, on='id_clana')\
                                     .merge(df_kontakti, on='id_clana')\
                                     .merge(df_izobrazevanje, on='id_clana')\
                                     .merge(df_dokumenti, on='id_clana')\
                                     .merge(df_solsko_leto, on='id_clana')\
                                     .merge(df_casovni_podatki, on='id_clana')
                        matching_rows = df[(df['ime'].str.lower() == first_name.lower()) & (df['priimek'].str.lower() == last_name.lower())]
                        if not matching_rows.empty:
                            combined_csv_data = pd.concat([combined_csv_data, matching_rows])

                # Export vpisni_list
                if export_vpisni_list:
                    df_dokumenti = read_database("dokumenti")
                    if df_dokumenti is not None:
                        matching_rows = df_dokumenti[(df_dokumenti['ime'].str.lower() == first_name.lower()) & (df_dokumenti['priimek'].str.lower() == last_name.lower())]
                        if not matching_rows.empty:
                            potrdilo_url = matching_rows.iloc[0]['potrdilo_url']
                            if potrdilo_url:
                                try:
                                    response = requests.get(potrdilo_url)
                                    response.raise_for_status()
                                    pdf_filename = f"{first_name.lower()}_{last_name.lower()}_vpisni_list.pdf"
                                    with open(pdf_filename, 'wb') as f:
                                        f.write(response.content)
                                    zipf.write(pdf_filename)
                                    os.remove(pdf_filename)
                                except requests.RequestException as e:
                                    print(f"Error fetching vpisni_list PDF for {first_name} {last_name}: {str(e)}")

                # Export potrdilo
                if export_potrdilo:
                    df_dokumenti = read_database("dokumenti")
                    if df_dokumenti is not None:
                        matching_rows = df_dokumenti[(df_dokumenti['ime'].str.lower() == first_name.lower()) & (df_dokumenti['priimek'].str.lower() == last_name.lower())]
                        if not matching_rows.empty:
                            vpis_url = matching_rows.iloc[0]['vpis_url']
                            if vpis_url:
                                try:
                                    response = requests.get(vpis_url)
                                    response.raise_for_status()
                                    pdf_filename = f"{first_name.lower()}_{last_name.lower()}_potrdilo.pdf"
                                    with open(pdf_filename, 'wb') as f:
                                        f.write(response.content)
                                    zipf.write(pdf_filename)
                                    os.remove(pdf_filename)
                                except requests.RequestException as e:
                                    print(f"Error fetching potrdilo PDF for {first_name} {last_name}: {str(e)}")

            # Save combined CSV data if export_clani is True
            if export_clani and not combined_csv_data.empty:
                combined_csv_filename = "combined_clani.csv"
                combined_csv_data.to_csv(combined_csv_filename, index=False, sep=';', encoding='utf-8-sig')
                zipf.write(combined_csv_filename)
                os.remove(combined_csv_filename)

        return FileResponse(zip_filename, media_type='application/zip', filename=zip_filename)
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=5000)
