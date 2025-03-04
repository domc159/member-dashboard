import os
import re
import email
from bs4 import BeautifulSoup
from poplib import POP3_SSL
from PyPDF2 import PdfReader
from sqlalchemy import create_engine
import pandas as pd
from datetime import datetime
import time

class EmailProcessor:

    def __init__(self, email_user, email_pass, pop_server="pop.gmail.com"):
        self.email_user = email_user
        self.email_pass = email_pass
        self.pop_server = pop_server
        self.upload_dir = "/home/database/uploads"
        self.setup_database()
        self.ensure_upload_dir()

    def setup_database(self):
        hostname = "10.10.5.27"
        database = "KSSB"
        username = "root"
        password = "tarcinakubik"
        self.engine = create_engine(f"mysql+pymysql://{username}:{password}@{hostname}/{database}")

    def ensure_upload_dir(self):
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir)
            print(f"Ustvarjena mapa: {self.upload_dir}")
        os.chmod(self.upload_dir, 0o755)

    def connect_to_email(self):
        self.pop = POP3_SSL(self.pop_server)
        self.pop.user(self.email_user)
        self.pop.pass_(self.email_pass)

    def process_emails(self):
        try:
            self.connect_to_email()
            num_messages = len(self.pop.list()[1])
            print(f"Število sporočil: {num_messages}")

            for i in range(num_messages):
                msg_num = i + 1
                response, lines, octets = self.pop.retr(msg_num)
                msg_content = b'\n'.join(lines).decode('utf-8', errors='ignore')
                email_message = email.message_from_string(msg_content)
                sender = email_message["From"]
                subject = email_message["Subject"]

                if "pomembno@studentski-servis.com" in sender or "domen.unuk@datanexus.si" in sender:
                    print(f"Obdelujem sporočilo od {sender}")
                    pdf_path, email_content = self.extract_pdf_and_email_content(email_message)

                    if pdf_path:
                        pdf_data = self.extract_data_from_pdf(pdf_path)
                        email_data = self.extract_data_from_email(email_content)  # Klic metode
                        combined_data = {**pdf_data, **email_data}
                        self.save_to_database(combined_data)

        finally:
            if hasattr(self, 'pop'):
                self.pop.quit()

    def extract_pdf_and_email_content(self, email_message):
        pdf_path = None
        email_body = None

        # Iterate through all parts of the email
        for part in email_message.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))

            # Handle PDF attachments
            if content_type == "application/pdf" and "attachment" in content_disposition:
                try:
                    filename = part.get_filename()
                    if filename == "potrdilo_o_vpisu.pdf":
                        payload = part.get_payload(decode=True)
                        if not payload:
                            continue
                        
                        # Generate a dynamic filename based on email body (if available)
                        new_filename = "unknown.pdf"
                        if email_body:
                            name_match = re.search(r"za\s+([\w]+)\s+([\w]+)", email_body, re.IGNORECASE)
                            if name_match:
                                ime, priimek = name_match.groups()
                                new_filename = f"{ime.lower()}_{priimek.lower()}.pdf"
                        
                        pdf_path = os.path.join(self.upload_dir, new_filename)
                        with open(pdf_path, "wb") as f:
                            f.write(payload)
                        print(f"PDF saved at: {pdf_path}")
                except Exception as e:
                    print(f"Error saving PDF: {str(e)}")

            # Handle email body (plain text or HTML)
            elif content_type in ["text/plain", "text/html"]:
                try:
                    raw_body = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='ignore')
                    if content_type == "text/html":
                        # Parse HTML to extract clean text
                        soup = BeautifulSoup(raw_body, 'html.parser')
                        clean_text = soup.get_text()
                        email_body = clean_text.strip()
                    else:
                        # Plain text is directly used
                        email_body = raw_body.strip()
                except Exception as e:
                    print(f"Error decoding email body: {str(e)}")

        if not email_body:
            print("No valid email body found.")
        return pdf_path, email_body
    def extract_data_from_pdf(self, pdf_path):
        if not os.path.isfile(pdf_path):
            print(f"Datoteka {pdf_path} ne obstaja.")
            return None

        # Preberi vsebino PDF-ja
        reader = PdfReader(pdf_path)
        text = "".join(page.extract_text() for page in reader.pages)

        # Regex vzorci za izvlečenje podatkov
        ime_priimek_match = re.search(r"([A-ZČŠŽ]+) ([A-ZČŠŽ]+), rojen/a (\d{2}\.\d{2}\.\d{4})", text)
        fakulteta_match = re.search(r"- ([A-ZČŠŽ\s]+)", text)
        program_match = re.search(r"smer ([A-ZČŠŽ\s\-]+)", text)
        letnik_match = re.search(r"(\d+)\. letnik", text)
        datum_vclanitve_match = re.search(r"z dne (\d{2}\.\d{2}\.\d{4})", text)

        # Pripravi podatke
        priimek = ime_priimek_match.group(1).lower() if ime_priimek_match else None
        ime = ime_priimek_match.group(2).lower() if ime_priimek_match else None
        datum_rojstva = "-".join(reversed(ime_priimek_match.group(3).split("."))) if ime_priimek_match else None
        fakulteta = fakulteta_match.group(1).strip().lower() if fakulteta_match else None
        studijski_program = program_match.group(1).strip().lower() if program_match else None
        letnik = int(letnik_match.group(1)) if letnik_match else None
        datum_vclanitve = "-".join(reversed(datum_vclanitve_match.group(1).split("."))) if datum_vclanitve_match else None

        # Vrnitev podatkov v obliki slovarja
        return {
            "ime": ime,
            "priimek": priimek,
            "datum_rojstva": datum_rojstva,
            "fakulteta": fakulteta,
            "studijski_program": studijski_program,
            "letnik": letnik,
            "datum_vclanitve": datum_vclanitve,
            "telefon": "/",  # Telefonska številka ni v PDF-ju
            "status": "",
            "potrdilo_url": f"https://api.datanexus.si/uploads/{os.path.basename(pdf_path)}",
            "processed_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }




    def extract_data_from_email(self, email_content):
        # Pretvori HTML vsebino v BeautifulSoup objekt
        soup = BeautifulSoup(email_content, "html.parser")
        print(soup.prettify())  # Debugging - izpis strukture HTML

        # Poišči naslov, poštno številko in pošto
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


        # Pripravi podatke
        data = {
            "email": email_address.lower() if email_address else None,
            "naslov": naslov_match.group(1).strip().lower() if naslov_match else None,
            "postna_stevilka": naslov_match.group(2).strip() if naslov_match else None,
            "posta": naslov_match.group(3).strip().lower() if naslov_match else None,
        }

        # Debug izpis za preverjanje izvlečenih podatkov
        print(f"Extracted data: {data}")
        return data




    def save_to_database(self, data):
        df = pd.DataFrame([data])
        df.to_sql("clani", con=self.engine, if_exists="append", index=False)


if __name__ == "__main__":
    EMAIL_USER = "baza@kssb.si"
    EMAIL_PASS = "qcvl zrhx vnvv noqk"

    processor = EmailProcessor(EMAIL_USER, EMAIL_PASS)

    while True:
        try:
            print(f"\nZačenjam preverjanje ob {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            processor.process_emails()
            #pdf_data = processor.extract_data_from_pdf("/home/database/uploads/potrdilo_o_vpisu.pdf")
            #print(pdf_data)

        except Exception as e:
            print(f"Napaka pri procesiranju e-pošte: {str(e)}")
        
        print("Čakam 5 sekund...")
        time.sleep(5)  # Počakaj 5 sekund pred naslednjim preverjanjem.
