import os
import re
import email
import poplib
from bs4 import BeautifulSoup
from poplib import POP3_SSL
from PyPDF2 import PdfReader, PdfWriter
from sqlalchemy import create_engine
import pandas as pd
from datetime import datetime, timedelta
import time
from email.header import decode_header
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from sqlalchemy import insert, table, column
from pdf_V2 import generate_membership_certificate
from PIL import Image
import io
import shutil
from db_manipulation import find_duplicates, remove_duplicates
import numpy as np
import logging
import sys

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), 'log')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'db_importer_log.txt')

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

def remove_diacritics(text):
    """Odstrani šumnike iz teksta."""
    replacements = {
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
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text
class EmailProcessorReaderBak:
    def __init__(self, email_user, email_pass, pop_server="pop.gmail.com"):
        self.email_user = email_user
        self.email_pass = email_pass
        self.pop_server = pop_server
        self.conn = None
        self.pristopna_dir = "/home/database/KSSB_V2/dokumenti/pristopna_izjava"
        self.potrdila_dir = "/home/database/KSSB_V2/dokumenti/potrdila_vpis"
        self.setup_database()
        self.ensure_directories()

    def ensure_directories(self):
        for directory in [self.pristopna_dir, self.potrdila_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                os.chmod(directory, 0o755)

    def process_attachments(self, email_message, id_clana, ime, priimek):
        attachments = []
        pristopna_found = False
        potrdilo_found = False

        # First pass - collect all attachments
        for part in email_message.walk():
            if part.get_content_maintype() == 'multipart':
                continue
            if part.get('Content-Disposition') is None:
                continue

            filename = part.get_filename()
            if not filename:
                continue

            # Decode filename if needed
            if isinstance(filename, bytes):
                filename = filename.decode()
            elif all(isinstance(t[0], bytes) for t in decode_header(filename)):
                filename = str(decode_header(filename)[0][0].decode())

            file_data = part.get_payload(decode=True)
            
            if filename.lower().startswith('pristopna_izjava_'):
                attachments.append(('pristopna', file_data, filename))
                pristopna_found = True
            else:
                # Any other attachment is considered as potrdilo
                attachments.append(('potrdilo', file_data, filename))
                potrdilo_found = True

        # Process attachments
        for attachment_type, file_data, original_filename in attachments:
            try:
                if attachment_type == 'pristopna':
                    new_filename = f"pristopna_izjava_{ime.lower()}_{priimek.lower()}.pdf"
                    file_path = os.path.join(self.pristopna_dir, new_filename)
                    with open(file_path, 'wb') as f:
                        f.write(file_data)
                    os.chmod(file_path, 0o644)
                    logger.info(f"Saved pristopna izjava: {file_path}")
                else:  # potrdilo
                    output_filename = f"{ime.lower()}_{priimek.lower()}_potrdilo_solanje.pdf"
                    output_path = os.path.join(self.potrdila_dir, output_filename)
                    
                    # Check file type and convert if necessary
                    if original_filename.lower().endswith('.pdf'):
                        with open(output_path, 'wb') as f:
                            f.write(file_data)
                    else:
                        # Try to convert image to PDF
                        try:
                            image = Image.open(io.BytesIO(file_data))
                            if image.mode in ['RGBA', 'LA']:
                                background = Image.new('RGB', image.size, (255, 255, 255))
                                background.paste(image, mask=image.split()[-1])
                                image = background
                            elif image.mode != 'RGB':
                                image = image.convert('RGB')
                            image.save(output_path, 'PDF', resolution=100.0)
                        except Exception as e:
                            logger.error(f"Error converting image to PDF: {str(e)}")
                            continue
                    
                    os.chmod(output_path, 0o644)
                    logger.info(f"Saved potrdilo solanje: {output_path}")
            except Exception as e:
                logger.error(f"Error processing attachment {original_filename}: {str(e)}")

        if not pristopna_found:
            logger.warning(f"Warning: No pristopna izjava found for {ime} {priimek}")
        if not potrdilo_found:
            logger.warning(f"Warning: No potrdilo found for {ime} {priimek}")

    def get_current_study_year(self):
        current_date = datetime.now()
        year = current_date.year
        if current_date.month >= 10:  # Če je trenutni mesec oktober ali kasneje
            start_year = year
            end_year = year + 1
        else:
            start_year = year - 1
            end_year = year
        return f"{str(start_year)[-2:]}/{str(end_year)[-2:]}"

    def get_study_year_for_date(self, date_str):
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        year = date_obj.year
        if date_obj.month >= 10:  # Če je trenutni mesec oktober ali kasneje
            start_year = year
            end_year = year + 1
        else:
            start_year = year - 1
            end_year = year
        return f"{str(start_year)[-2:]}/{str(end_year)[-2:]}"

    def connect_to_email(self):
        try:
            self.pop = poplib.POP3_SSL(self.pop_server)
            self.pop.user(self.email_user)
            self.pop.pass_(self.email_pass)
        except Exception as e:
            logger.error(f"Error connecting to email: {str(e)}")
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
            'zadnje_leto_vpisa': self.get_study_year_for_date(self.safe_find(soup, "DANAŠNJI DATUM:")),
            'processed_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

    def setup_database(self):
        hostname = "10.10.5.27"
        database = "KSSB_V2"
        username = "root"
        password = "tarcinakubik"
        self.engine = create_engine(f"mysql+pymysql://{username}:{password}@{hostname}/{database}")
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

    def save_to_database(self, data):
        try:
            # Save data to database
            with self.engine.begin() as connection:
                # Insert into clani table first to get id_clana
                clani_table = table('clani', column('ime'), column('priimek'))
                clani_stmt = insert(clani_table).values(ime=data['ime'], priimek=data['priimek'])
                result = connection.execute(clani_stmt)
                id_clana = result.inserted_primary_key[0] if result.inserted_primary_key else result.lastrowid

                # After getting id_clana, generate membership certificate
                pdf_path = generate_membership_certificate(pd.DataFrame([data]))
                logger.info(f"Generated PDF certificate: {pdf_path}")
                
                # Add URLs to data - using lowercase names for URLs but preserving original case for display
                ime_url = remove_diacritics(data['ime'].lower().replace(' ', '_'))
                priimek_url = remove_diacritics(data['priimek'].lower().replace(' ', '_'))

                # Now process attachments with the id_clana
                self.process_attachments(self._current_email_message, id_clana, ime_url, priimek_url)

                # Update URLs with id_clana
                data['vpis_url'] = f"https://api.datanexus.si/dokumenti/pristopna_izjava/pristopna_izjava_{ime_url}_{priimek_url}.pdf"
                data['potrdilo_url'] = f"https://api.datanexus.si/dokumenti/potrdila_vpis/{ime_url}_{priimek_url}_potrdilo_solanje.pdf"
                data['clansko_potrdilo_url'] = f"https://api.datanexus.si/dokumenti/potrdila_clanstvo/{ime_url}_{priimek_url}_potrdilo_o_clanstvu.pdf"

                # Insert into osebni_podatki table
                osebni_podatki_table = table('osebni_podatki', column('id_clana'), column('naslov'), column('posta'), column('postna_stevilka'), column('datum_rojstva'))
                osebni_podatki_stmt = insert(osebni_podatki_table).values(
                    id_clana=id_clana,
                    naslov=data['naslov'],
                    posta=data['posta'],
                    postna_stevilka=data['postna_stevilka'],
                    datum_rojstva=data['datum_rojstva']
                )
                connection.execute(osebni_podatki_stmt)
                
                # Insert into kontakti table
                kontakti_table = table('kontakti', column('id_clana'), column('email'), column('telefon'))
                kontakti_stmt = insert(kontakti_table).values(
                    id_clana=id_clana,
                    email=data['email'],
                    telefon=data['telefon']
                )
                connection.execute(kontakti_stmt)
                
                # Insert into izobrazevanje table
                izobrazevanje_table = table('izobrazevanje', column('id_clana'), column('fakulteta'), column('studijski_program'), column('letnik'), column('status'))
                izobrazevanje_stmt = insert(izobrazevanje_table).values(
                    id_clana=id_clana,
                    fakulteta=data['fakulteta'],
                    studijski_program=data['studijski_program'],
                    letnik=data['letnik'],
                    status=data['status']
                )
                connection.execute(izobrazevanje_stmt)
                
                # Insert into dokumenti table
                dokumenti_table = table('dokumenti', column('id_clana'), column('potrdilo_url'), column('vpis_url'), column('clansko_potrdilo_url'))
                dokumenti_stmt = insert(dokumenti_table).values(
                    id_clana=id_clana,
                    potrdilo_url=data['potrdilo_url'],
                    vpis_url=data['vpis_url'],
                    clansko_potrdilo_url=data['clansko_potrdilo_url']
                )
                connection.execute(dokumenti_stmt)
                
                # Insert into solsko_leto table
                solsko_leto_table = table("solsko_leto", column("id_clana"), column("trenutno_leto"), column("zadnje_leto_vpisa"))
                solsko_leto_stmt = insert(solsko_leto_table).values(
                    id_clana=id_clana,
                    trenutno_leto=self.get_current_study_year(),
                    zadnje_leto_vpisa=data['zadnje_leto_vpisa'],
                )
                connection.execute(solsko_leto_stmt)
                
                # Insert into casovni_podatki table
                casovni_podatki_table = table('casovni_podatki', column('id_clana'), column('datum_vclanitve'), column('processed_date'))
                casovni_podatki_stmt = insert(casovni_podatki_table).values(
                    id_clana=id_clana,
                    datum_vclanitve=data['datum_vclanitve'],
                    processed_date=data['processed_date']
                )
                connection.execute(casovni_podatki_stmt)
            return True
        except Exception as e:
            logger.error(f"Error saving to database: {str(e)}")
            return False

    def process_emails(self):
        try:
            self.connect_to_email()
            num_messages = len(self.pop.list()[1])
            for i in range(num_messages):
                msg_num = i + 1
                try:
                    lines = self.pop.retr(msg_num)[1]
                    msg_content = b'\n'.join(lines).decode('utf-8', errors='ignore')
                    email_message = email.message_from_string(msg_content)
                    self._current_email_message = email_message  # Store for later use
                    subject = ''
                    if email_message['subject']:
                        subject = decode_header(email_message['subject'])[0][0]
                        if isinstance(subject, bytes):
                            subject = subject.decode()
                    if "Novi član" in subject:
                        html_content = None
                        for part in email_message.walk():
                            if part.get_content_type() == "text/html":
                                html_content = part.get_payload(decode=True).decode()
                                break
                        if html_content:
                            data = self.extract_data_from_html(html_content)
                            self.save_to_database(data)
                except Exception as e:
                    logger.error(f"Error processing message {msg_num}: {str(e)}")
                    continue
        except Exception as e:
            logger.error(f"Error processing emails: {str(e)}")
        finally:
            try:
                if hasattr(self, 'pop'):
                    self.pop.quit()
            except:
                pass

    def close(self):
        if self.conn:
            self.conn.close()

class EmailProcessorMailReader:
    def __init__(self, email_user, email_pass, pop_server="pop.gmail.com"):
        self.email_user = email_user
        self.email_pass = email_pass
        self.pop_server = pop_server
        self.upload_dir = "/home/database/KSSB_V2/dokumenti/eservis"
        self.setup_database()
        self.ensure_upload_dir()

    def get_current_study_year(self):
        current_date = datetime.now()
        year = current_date.year
        if current_date.month >= 10:  # Če je trenutni mesec oktober ali kasneje
            start_year = year
            end_year = year + 1
        else:
            start_year = year - 1
            end_year = year
        return f"{str(start_year)[-2:]}/{str(end_year)[-2:]}"

    def setup_database(self):
        hostname = "10.10.5.27"
        database = "KSSB_V2"
        username = "root"
        password = "tarcinakubik"
        self.engine = create_engine(f"mysql+pymysql://{username}:{password}@{hostname}/{database}")

    def ensure_upload_dir(self):
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir)
            logger.info(f"Created directory: {self.upload_dir}")
        os.chmod(self.upload_dir, 0o755)

    def connect_to_email(self):
        self.pop = POP3_SSL(self.pop_server)
        self.pop.user(self.email_user)
        self.pop.pass_(self.email_pass)

    def process_emails(self):
        try:
            self.connect_to_email()
            num_messages = len(self.pop.list()[1])
            for i in range(num_messages):
                msg_num = i + 1
                response, lines, octets = self.pop.retr(msg_num)
                msg_content = b'\n'.join(lines).decode('utf-8', errors='ignore')
                email_message = email.message_from_string(msg_content)
                sender = email_message["From"]
                subject = email_message["Subject"]
                if "pomembno@studentski-servis.com" in sender or "domen.unuk@datanexus.si" in sender:
                    pdf_path, email_content = self.extract_pdf_and_email_content(email_message)
                    if pdf_path:
                        pdf_data = self.extract_data_from_pdf(pdf_path)
                        email_data = self.extract_data_from_email(email_content)
                        combined_data = {**pdf_data, **email_data}
                        self.save_to_database(combined_data)
                        logger.info(f"Generated PDF certificate: {pdf_path}")
        finally:
            if hasattr(self, 'pop'):
                self.pop.quit()

    def extract_pdf_and_email_content(self, email_message):
        pdf_path = None
        email_body = None
        for part in email_message.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "application/pdf" and "attachment" in content_disposition:
                try:
                    filename = part.get_filename()
                    if filename == "potrdilo_o_vpisu.pdf":
                        payload = part.get_payload(decode=True)
                        if not payload:
                            continue
                        new_filename = "unknown.pdf"
                        if email_body:
                            name_match = re.search(r"za\s+([\w]+)\s+([\w]+)", email_body, re.IGNORECASE)
                            if name_match:
                                ime, priimek = name_match.groups()
                                new_filename = f"{ime.lower()}_{priimek.lower()}_eservis_prijavnica.pdf"
                        pdf_path = os.path.join(self.upload_dir, new_filename)
                        with open(pdf_path, "wb") as f:
                            f.write(payload)
                except Exception as e:
                    logger.error(f"Error saving PDF: {str(e)}")
            elif content_type in ["text/plain", "text/html"]:
                try:
                    raw_body = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='ignore')
                    if content_type == "text/html":
                        soup = BeautifulSoup(raw_body, 'html.parser')
                        clean_text = soup.get_text()
                        email_body = clean_text.strip()
                    else:
                        email_body = raw_body.strip()
                except Exception as e:
                    logger.error(f"Error decoding email body: {str(e)}")
        return pdf_path, email_body

    def extract_data_from_pdf(self, pdf_path):
        if not os.path.isfile(pdf_path):
            return None
        reader = PdfReader(pdf_path)
        text = "".join(page.extract_text() for page in reader.pages)
        ime_priimek_match = re.search(r"([A-ZČŠŽ]+) ([A-ZČŠŽ]+), rojen/a (\d{2}\.\d{2}\.\d{4})", text)
        fakulteta_match = re.search(r"- ([A-ZČŠŽ\s]+)", text)
        program_match = re.search(r"smer ([A-ZČŠŽ\s\-]+)", text)
        letnik_match = re.search(r"(\d+)\. letnik", text)
        datum_vclanitve_match = re.search(r"z dne (\d{2}\.\d{2}\.\d{4})", text)
        studijsko_leto_match = re.search(r"študijskem letu (\d{4})/(\d{4})", text)
        
        priimek = ime_priimek_match.group(1).lower() if ime_priimek_match else None
        ime = ime_priimek_match.group(2).lower() if ime_priimek_match else None
        datum_rojstva = "-".join(reversed(ime_priimek_match.group(3).split("."))) if ime_priimek_match else None
        fakulteta = fakulteta_match.group(1).strip().lower() if fakulteta_match else None
        studijski_program = program_match.group(1).strip().lower() if program_match else None
        letnik = int(letnik_match.group(1)) if letnik_match else None
        datum_vclanitve = "-".join(reversed(datum_vclanitve_match.group(1).split("."))) if datum_vclanitve_match else None
        studijsko_leto = f"{studijsko_leto_match.group(1)[2:]}/{studijsko_leto_match.group(2)[2:]}" if studijsko_leto_match else None
        
        # Determine status based on the presence of "fakulteta" in the fakulteta variable
        status = "študent" if fakulteta and ("fakulteta" in fakulteta or "Fakulteta" in fakulteta) else "/"
        
        return {
            "ime": ime,
            "priimek": priimek,
            "datum_rojstva": datum_rojstva,
            "fakulteta": fakulteta,
            "studijski_program": studijski_program,
            "letnik": letnik,
            "datum_vclanitve": datum_vclanitve,
            "zadnje_leto_vpisa": studijsko_leto,
            "telefon": "/",
            "status": status,
            "processed_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

    def extract_data_from_email(self, email_content):
        soup = BeautifulSoup(email_content, "html.parser")
        naslov_element = soup.find(string=lambda text: text and "Naslov:" in text)
        if naslov_element:
            parent = naslov_element.find_parent()
            if parent:
                naslov_match = re.search(r"Naslov:\s*(.+?),\s*(\d{4})\s+(.+)", parent.get_text(strip=True))
            else:
                naslov_match = None
        else:
            naslov_match = None
        email_element = soup.find(string=lambda text: text and "Email:" in text)
        if email_element:
            parent = email_element.find_parent()
            if parent:
                email_match = re.search(r"Email:\s*([\w\.-]+@[\w\.-]+)", parent.get_text(strip=True))
            else:
                email_match = None
        else:
            email_match = None
        email_address = email_match.group(1).strip().lower() if email_match else None
        data = {
            "email": email_address.lower() if email_address else None,
            "naslov": naslov_match.group(1).strip().lower() if naslov_match else None,
            "postna_stevilka": naslov_match.group(2).strip() if naslov_match else None,
            "posta": naslov_match.group(3).strip().lower() if naslov_match else None,
        }
        return data

    def save_to_database(self, data):
        try:
            # Save data to database
            with self.engine.begin() as connection:
                # Insert into clani table first to get id_clana
                clani_table = table('clani', column('ime'), column('priimek'))
                clani_stmt = insert(clani_table).values(ime=data['ime'], priimek=data['priimek'])
                result = connection.execute(clani_stmt)
                id_clana = result.inserted_primary_key[0] if result.inserted_primary_key else result.lastrowid

                # After getting id_clana, generate membership certificate
                pdf_path = generate_membership_certificate(pd.DataFrame([data]))
                logger.info(f"Generated PDF certificate: {pdf_path}")
                
                # Add URLs to data - using lowercase names for URLs but preserving original case for display
                ime_url = remove_diacritics(data['ime'].lower().replace(' ', '_'))
                priimek_url = remove_diacritics(data['priimek'].lower().replace(' ', '_'))

                # Update URLs with id_clana
                data['vpis_url'] = f"https://api.datanexus.si/dokumenti/eservis/{ime_url}_{priimek_url}_{id_clana}_eservis_prijavnica.pdf"
                data['clansko_potrdilo_url'] = f"https://api.datanexus.si/dokumenti/potrdila_clanstvo/{ime_url}_{priimek_url}_potrdilo_o_clanstvu.pdf"
                data['potrdilo_url'] = f"https://api.datanexus.si/dokumenti/eservis/{ime_url}_{priimek_url}_{id_clana}_eservis_prijavnica.pdf"

                # Insert into osebni_podatki table
                osebni_podatki_table = table('osebni_podatki', column('id_clana'), column('naslov'), column('posta'), column('postna_stevilka'), column('datum_rojstva'))
                osebni_podatki_stmt = insert(osebni_podatki_table).values(
                    id_clana=id_clana,
                    naslov=data['naslov'],
                    posta=data['posta'],
                    postna_stevilka=data['postna_stevilka'],
                    datum_rojstva=data['datum_rojstva']
                )
                connection.execute(osebni_podatki_stmt)
                
                # Insert into kontakti table
                kontakti_table = table('kontakti', column('id_clana'), column('email'), column('telefon'))
                kontakti_stmt = insert(kontakti_table).values(
                    id_clana=id_clana,
                    email=data['email'],
                    telefon=data['telefon']
                )
                connection.execute(kontakti_stmt)
                
                # Insert into izobrazevanje table
                izobrazevanje_table = table('izobrazevanje', column('id_clana'), column('fakulteta'), column('studijski_program'), column('letnik'), column('status'))
                izobrazevanje_stmt = insert(izobrazevanje_table).values(
                    id_clana=id_clana,
                    fakulteta=data['fakulteta'],
                    studijski_program=data['studijski_program'],
                    letnik=data['letnik'],
                    status=data['status']
                )
                connection.execute(izobrazevanje_stmt)
                
                # Insert into dokumenti table
                dokumenti_table = table('dokumenti', column('id_clana'), column('potrdilo_url'), column('vpis_url'), column('clansko_potrdilo_url'))
                dokumenti_stmt = insert(dokumenti_table).values(
                    id_clana=id_clana,
                    potrdilo_url=data['potrdilo_url'],
                    vpis_url=data['vpis_url'],
                    clansko_potrdilo_url=data['clansko_potrdilo_url']
                )
                connection.execute(dokumenti_stmt)
                
                # Insert into solsko_leto table
                solsko_leto_table = table("solsko_leto", column("id_clana"), column("trenutno_leto"), column("zadnje_leto_vpisa"))
                solsko_leto_stmt = insert(solsko_leto_table).values(
                    id_clana=id_clana,
                    trenutno_leto=self.get_current_study_year(),
                    zadnje_leto_vpisa=data['zadnje_leto_vpisa'],
                )
                connection.execute(solsko_leto_stmt)
                
                # Insert into casovni_podatki table
                casovni_podatki_table = table('casovni_podatki', column('id_clana'), column('datum_vclanitve'), column('processed_date'))
                casovni_podatki_stmt = insert(casovni_podatki_table).values(
                    id_clana=id_clana,
                    datum_vclanitve=data['datum_vclanitve'],
                    processed_date=data['processed_date']
                )
                connection.execute(casovni_podatki_stmt)
            return True
        except Exception as e:
            logger.error(f"Error saving to database: {str(e)}")
            return False

if __name__ == "__main__":
    EMAIL_USER = "baza@kssb.si"
    EMAIL_PASS = "qcvl zrhx vnvv noqk"
    CHECK_INTERVAL = 3600  # ena ura čakanja

    while True:
        try:
            logger.info(f"\nStarting new check at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            processor_reader_bak = EmailProcessorReaderBak(EMAIL_USER, EMAIL_PASS)
            processor_mail_reader = EmailProcessorMailReader(EMAIL_USER, EMAIL_PASS)
            
            processor_reader_bak.connect_to_email()
            num_messages = len(processor_reader_bak.pop.list()[1])
            
            for i in range(num_messages):
                msg_num = i + 1
                try:
                    response, lines, octets = processor_reader_bak.pop.retr(msg_num)
                    msg_content = b'\n'.join(lines).decode('utf-8', errors='ignore')
                    email_message = email.message_from_string(msg_content)
                    sender = email_message["From"]
                    
                    if "vclanitev@kssb.si" in sender or "middleearth159@gmail.com" in sender:
                        # Process single email with ReaderBak
                        processor_reader_bak._current_email_message = email_message
                        subject = ''
                        if email_message['subject']:
                            subject = decode_header(email_message['subject'])[0][0]
                            if isinstance(subject, bytes):
                                subject = subject.decode()
                        if "Novi član" in subject:
                            html_content = None
                            for part in email_message.walk():
                                if part.get_content_type() == "text/html":
                                    html_content = part.get_payload(decode=True).decode()
                                    break
                            if html_content:
                                data = processor_reader_bak.extract_data_from_html(html_content)
                                processor_reader_bak.save_to_database(data)
                    
                    elif "domen.unuk@datanexus.si" in sender or "pomembno@studentski-servis.com" in sender:
                        # Process single email with MailReader
                        pdf_path, email_content = processor_mail_reader.extract_pdf_and_email_content(email_message)
                        if pdf_path:
                            pdf_data = processor_mail_reader.extract_data_from_pdf(pdf_path)
                            email_data = processor_mail_reader.extract_data_from_email(email_content)
                            combined_data = {**pdf_data, **email_data}
                            processor_mail_reader.save_to_database(combined_data)
                            logger.info(f"Generated PDF certificate: {pdf_path}")
                except Exception as e:
                    logger.error(f"Error processing message {msg_num}: {str(e)}")
                    continue
            
            # First find duplicates to see what will be removed
            find_duplicates()
            # Then remove them
            remove_duplicates()
        except Exception as e:
            logger.error(f"Main error: {str(e)}")
        finally:
            if hasattr(processor_reader_bak, 'pop'):
                processor_reader_bak.pop.quit()
            if hasattr(processor_mail_reader, 'pop'):
                processor_mail_reader.pop.quit()
                
        logger.info(f"Waiting {CHECK_INTERVAL} seconds until next check...")
        time.sleep(CHECK_INTERVAL)
