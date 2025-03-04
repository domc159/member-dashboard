from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm
import os
from datetime import datetime
import pandas as pd
import logging
import sys

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), 'log')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'pdf_V2_log.txt')

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

# Create directory if it doesn't exist
BASE_DIR = "/home/database/KSSB_V2"
OUTPUT_DIR = os.path.join(BASE_DIR, "dokumenti/potrdila_clanstvo")
MATERIAL_DIR = os.path.join(BASE_DIR, "backend/pdf_materjal")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_membership_certificate(df):
    # Get the first row of data since we're processing one member at a time
    data = df.iloc[0]
    
    # Format the data
    ime_priimek = f"{data['ime']} {data['priimek']}"
    datum_rojstva = datetime.strptime(data['datum_rojstva'], '%Y-%m-%d').strftime('%d. %m. %Y')
    naslov_full = f"{data['naslov']}"
    posta_full = f"{data['postna_stevilka']} {data['posta']}"
    
    # Get current date for the document
    current_date = datetime.now().strftime('%d. %m. %Y')
    
    # Generate unique certificate number
    certificate_number = f"KŠSB-{datetime.now().year}-{data['ime'][:2]}{data['priimek'][:2]}"
    
    # Create output filename - using lowercase for filenames
    ime_file = data['ime'].lower().replace(' ', '_')
    priimek_file = data['priimek'].lower().replace(' ', '_')
    output_file = os.path.join(OUTPUT_DIR, f"{ime_file}_{priimek_file}_potrdilo_o_clanstvu.pdf")
    
    # Create data dictionary for certificate generation
    certificate_data = {
        "datum": current_date,
        "stevilka_potrdila": certificate_number,
        "ime_priimek": ime_priimek,
        "datum_rojstva": datum_rojstva,
        "naslov": naslov_full,
        "posta": posta_full
    }
    
    # Generate the certificate
    generate_membership_certificate_internal(certificate_data, output_file)
    logger.info(f"PDF uspešno generiran: {output_file}")
    return output_file

def generate_membership_certificate_internal(data, output_file):
    # Podatki za generiranje PDF
    datum = data.get("datum")
    stevilka_potrdila = data.get("stevilka_potrdila")
    ime_priimek = data.get("ime_priimek")
    datum_rojstva = data.get("datum_rojstva")
    naslov = data.get("naslov")
    posta = data.get("posta")

    # Kreiranje PDF z UTF-8 podporo
    c = canvas.Canvas(output_file, pagesize=A4)
    c.setTitle("Potrdilo o članstvu")
    width, height = A4

    # Nastavitev fonta
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

    # Margins and positions
    left_margin = 2.5 * cm
    
    # Add header image first - 1.75x original size, positioned in the first third of the page width
    header_height = 5.25 * cm  # 1.75 * 3cm (original height)
    header_width = width / 1.65  # Divide the page width into 3 parts and use the first third
    c.drawImage(os.path.join(MATERIAL_DIR, "header.png"), 0, height - header_height, header_width, header_height, preserveAspectRatio=True, mask='auto')
    
    # Start content 1cm below header image
    top_margin = height - header_height - 1 * cm
    line_height = 0.7 * cm

    # Header information
    c.setFont("DejaVuSans", 11)
    c.drawString(left_margin, top_margin, f"Datum: {datum}")
    c.drawString(left_margin, top_margin - line_height, f"Številka potrdila: {stevilka_potrdila}")

    # Title
    c.setFont("DejaVuSans-Bold", 12)
    title_y = top_margin - (3 * line_height)
    c.drawString(left_margin, title_y, "ZADEVA: Potrdilo o članstvu v Klub študentov Slovenska Bistrica")

    # Main content
    c.setFont("DejaVuSans", 11)
    content_y = title_y - (2 * line_height)
    
    # First paragraph
    first_para = f"Potrjujemo, da je {ime_priimek}, rojen/a {datum_rojstva}, stanujoč/a {naslov}, {posta}, "
    first_para += "v šolskem letu 2024/2025 včlanjen/a v Klub študentov Slovenska Bistrica, prijavljenem na naslovu "
    first_para += "Trg svobode 5, 2310 Slovenska Bistrica."
    
    # Split text into lines that fit within the margins
    def wrap_text(text, width, font_name, font_size):
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            current_line.append(word)
            line_width = c.stringWidth(' '.join(current_line), font_name, font_size)
            if line_width > (width - (5 * cm)):
                current_line.pop()
                lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        return lines

    # Draw wrapped text
    y_position = content_y
    for line in wrap_text(first_para, width, "DejaVuSans", 11):
        c.drawString(left_margin, y_position, line)
        y_position -= line_height

    # Membership period
    y_position -= line_height
    c.drawString(left_margin, y_position, 
                "Članstvo v Klubu študentov Slovenska Bistrica mu/ji velja od 01. 10. 2024 do 30. 09. 2025.")

    # Purpose statement
    y_position -= (2 * line_height)
    c.drawString(left_margin, y_position, "Potrdilo izdajamo na željo člana/ice.")

    # Signature
    signature_y = y_position - (5 * line_height)
    c.setFont("DejaVuSans", 11)
    c.drawString(width - (7 * cm), signature_y, "Nina Cafuta, Predsednica")
    c.drawString(width - (9 * cm), signature_y - line_height, "Kluba študentov Slovenska Bistrica")

    # Add bottom images - 7cm below the last text line
    image_y_position = signature_y - line_height - 7 * cm
    c.drawImage(os.path.join(MATERIAL_DIR, "zig.jpg"), (width - 8 * cm) / 2, image_y_position, width=8 * cm, height=3 * cm, preserveAspectRatio=True, mask='auto')
    c.drawImage(os.path.join(MATERIAL_DIR, "podpis.jpg"), (width + 2 * cm) / 2, image_y_position + 3 * cm, width=6 * cm, height=2.25 * cm, preserveAspectRatio=True, mask='auto')
    
    # Zaključi in shrani PDF
    c.save()