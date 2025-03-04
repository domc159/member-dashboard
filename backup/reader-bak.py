import poplib
import email
from bs4 import BeautifulSoup
import sqlite3
from email.header import decode_header
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import pandas as pd
import time

class EmailProcessor:


    def __init__(self, email_user, email_pass, pop_server="pop.gmail.com"):
        self.email_user = email_user
        self.email_pass = email_pass
        self.pop_server = pop_server
        self.conn = None  # Inicializacija conn atributa
        self.setup_database()
    

    
    def connect_to_email(self):
        try:
            # Povezava na POP3 strežnik z SSL
            self.pop = poplib.POP3_SSL(self.pop_server)
            print(f"Povezovanje na strežnik: {self.pop_server}")
            
            # Prijava
            print(f"Prijavljanje uporabnika: {self.email_user}")
            self.pop.user(self.email_user)
            self.pop.pass_(self.email_pass)
            
            # Izpis informacij o nabiralniku
            print(f"Povezava uspešna. Število sporočil: {len(self.pop.list()[1])}")
        except poplib.error_proto as e:
            print(f"Napaka pri povezavi na email strežnik: {str(e)}")
            raise
        except Exception as e:
            print(f"Nepričakovana napaka: {str(e)}")
            raise
    
    def safe_find(self, soup, label):
        element = soup.find(string=lambda text: text and label in text)
        if element:
            next_element = element.find_next('b') or element.find_next('a')
            return next_element.text.strip() if next_element else None
        return None
    
    def extract_data_from_html(self, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        
        potrdilo_element = soup.find(string=lambda text: text and "SKENIRANO POTRDILO:" in text)
        potrdilo_url = potrdilo_element.find_next('a')['href'] if potrdilo_element else None
        
        # Modified to use exact string matching
        def exact_find(label):
            element = soup.find(string=lambda text: text and text.strip() == label)
            if element:
                next_element = element.find_next('b') or element.find_next('a')
                return next_element.text.strip() if next_element else None
            return None
        
        return {
            'ime': self.safe_find(soup, "IME:"),
            'priimek': self.safe_find(soup, "PRIIMEK:"),
            'datum_rojstva': self.safe_find(soup, "DATUM ROJSTVA:"),
            'email': exact_find("E-POŠTA:"),
            'telefon': self.safe_find(soup, "TELEFONSKA ŠTEVILKA:"),
            'naslov': self.safe_find(soup, "NASLOV STALNEGA PREBIVALIŠČA:"),
            'posta': exact_find("POŠTA:"),
            'postna_stevilka': self.safe_find(soup, "POŠTNA ŠTEVILKA:"),
            'fakulteta': self.safe_find(soup, "NAZIV FAKULTET/ŠOLE:"),
            'studijski_program': self.safe_find(soup, "IME ŠTUDIJSKEGA PROGRAMA:"),
            'letnik': self.safe_find(soup, "LETNIK ŠTUDIJA:"),
            'datum_vclanitve': self.safe_find(soup, "DANAŠNJI DATUM:"),
            'status': self.safe_find(soup, "STATUS:"),
            'potrdilo_url': potrdilo_url,
            'processed_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def setup_database(self):
        hostname = "10.10.5.27"
        database = "KSSB"
        username = "root"
        password = "tarcinakubik"

        self.engine = create_engine(f"mysql+pymysql://{username}:{password}@{hostname}/{database}")
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

    def save_to_database(self, data):
        # Print all values from data dictionary
        pd_data = pd.DataFrame(data, index=[0])
        # Convert all string columns to lowercase
        pd_data = pd_data.apply(lambda x: x.str.lower() if x.dtype == "object" else x)
        print(pd_data)
        pd_data.to_sql('clani', con=self.engine, if_exists='append', index=False)
        return True
    
    def remove_duplicates(self):
        # Read the entire table into a pandas DataFrame
        df = pd.read_sql('SELECT * FROM clani', self.engine)
        
        # Drop duplicates keeping the first occurrence, based on email and telefon columns
        df_no_duplicates = df.drop_duplicates(subset=['email', 'telefon'], keep='first')
        
        # Start a transaction
        with self.engine.begin() as connection:
            # Delete all records from the table
            connection.execute(text('DELETE FROM clani'))
            # Write back the deduplicated data
            df_no_duplicates.to_sql('clani', con=connection, if_exists='append', index=False)
    

    def process_emails(self):
        try:
            self.connect_to_email()
            
            # Pridobi število sporočil
            num_messages = len(self.pop.list()[1])
            print(f"Število sporočil za procesiranje: {num_messages}")
            
            for i in range(num_messages):
                msg_num = i + 1
                try:
                    print(f"Procesiranje sporočila {msg_num}/{num_messages}")
                    
                    # Pridobi sporočilo
                    lines = self.pop.retr(msg_num)[1]
                    msg_content = b'\n'.join(lines).decode('utf-8', errors='ignore')
                    email_message = email.message_from_string(msg_content)
                    
                    # Preveri zadevo
                    subject = ''
                    if email_message['subject']:
                        subject = decode_header(email_message['subject'])[0][0]
                        if isinstance(subject, bytes):
                            subject = subject.decode()
                    
                    if "Novi član" in subject:
                        print(f"Najdeno sporočilo novega člana")
                        
                        # Pridobi HTML vsebino
                        html_content = None
                        for part in email_message.walk():
                            if part.get_content_type() == "text/html":
                                html_content = part.get_payload(decode=True).decode()
                                break
                        
                        if html_content:
                            data = self.extract_data_from_html(html_content)
                            self.save_to_database(data)
                
                except Exception as e:
                    print(f"Napaka pri procesiranju sporočila {msg_num}: {str(e)}")
                    continue
                
        except Exception as e:
            print(f"Napaka pri procesiranju emailov: {str(e)}")
        finally:
            try:
                if hasattr(self, 'pop'):
                    self.pop.quit()
            except:
                pass

    def close(self):
        if self.conn:
            self.conn.close()

if __name__ == "__main__":
    EMAIL_USER = "baza@kssb.si"
    EMAIL_PASS = "qcvl zrhx vnvv noqk "
    CHECK_INTERVAL = 3  #300s = 5min
    
    while True:
        try:
            print(f"\nZačenjam novo preverjanje ob {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            processor = EmailProcessor(EMAIL_USER, EMAIL_PASS)
            processor.process_emails()
            processor.remove_duplicates()
        except Exception as e:
            print(f"Glavna napaka: {str(e)}")
        finally:
            processor.close()
            
        print(f"Čakam {CHECK_INTERVAL} sekund do naslednjega preverjanja...")
        time.sleep(CHECK_INTERVAL)