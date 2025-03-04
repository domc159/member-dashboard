from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from datetime import datetime

# Registriraj pisavo, ki podpira UTF-8 (npr. DejaVuSans)
pdfmetrics.registerFont(TTFont("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))

def generate_pdf_certificate(df, image_path, output_dir="/home/database/pdf"):
    """
    Generira PDF certifikat na podlagi predloge in podatkov iz pandas DataFrame ter doda sliko na vrh.
    
    Args:
        df (pandas.DataFrame): DataFrame z vrednostmi za vnos v certifikat (ime, priimek, naslov, datum itd.).
        image_path (str): Pot do slike, ki jo je treba dodati na vrh PDF-ja.
        output_dir (str): Izhodna mapa za generirani PDF.
        
    Returns:
        str: Pot do generiranega PDF-ja.
    """
    # Pretvori DataFrame v slovar
    data = df.iloc[0].to_dict()
    
    # Preveri, ali izhodna mapa obstaja, sicer jo ustvari
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Ustvari ime datoteke za izhodni PDF
    ime = data.get("ime", "neznano").lower()
    priimek = data.get("priimek", "neznano").lower()
    output_filename = f"{ime}_{priimek}_potrdilo.pdf"
    output_path = os.path.join(output_dir, output_filename)
    ulica = data.get("naslov", "neznano")
    postan_st = data.get("postna_stevilka", "neznano")
    posta = data.get("posta", "neznano")
    full_address = f"{ulica}, {postan_st} {posta}"
    
    # Ustvari nov PDF z uporabo ReportLab
    c = canvas.Canvas(output_path, pagesize=letter)
    
    # Dimenzije strani
    width, height = letter
    
    # Dodaj sliko na vrh strani (centirano)
    if os.path.exists(image_path):
        img_width = 300  # Širina slike v točkah
        img_height = 200  # Višina slike v točkah
        x_position = (width - img_width) / 2  # Centrirano po širini
        y_position = height - img_height - 50  # Odmik od zgornjega roba
        c.drawImage(image_path, x_position, y_position, width=img_width, height=img_height, preserveAspectRatio=True)
    else:
        print(f"Slika na poti {image_path} ne obstaja.")
    
    # Definiraj vsebino certifikata
    naslov = "Potrdilo o vpisu v Klub študentov Slovenska Bistrica"
    uvod = "Spodaj podpisani Klub študentov Slovenska Bistrica potrjuje,"
    uvod1 = " da je naslednja oseba vpisana kot član kluba:"
    ime_priimek = f"Ime in priimek: {data.get('ime', 'Neznano')} {data.get('priimek', 'Neznano')}"
    naslov_stalnega = f"Naslov stalnega prebivališča: {full_address}"
    zakljucek = "Potrdilo velja kot dokaz o članstvu v klubu in je izdano na zahtevo člana za osebne potrebe."
    zakljucek1 = f"Slovenska Bistrica, dne {data.get('datum_vclanitve', datetime.now().strftime('%d.%m.%Y'))}."
    podpis = "Klub študentov Slovenska Bistrica"
    predsednica = "Nina Cafuta"
    
    # Poravnava besedila na sredino strani
    c.setFont("DejaVuSans", 12)
    
    text_objects = [naslov, "", "", uvod, uvod1, "", ime_priimek, naslov_stalnega, "", zakljucek, "", zakljucek1, podpis, predsednica]
    
    y_position = height / 2 + 50  # Začne risati od sredine navzdol
    for line in text_objects:
        if line:  # Preskoči prazne vrstice
            text_width = c.stringWidth(line, "DejaVuSans", 12)
            x_position = (width - text_width) / 2  # Centrirano po širini
            c.drawString(x_position, y_position, line)
        y_position -= 20  # Premik navzdol za naslednjo vrstico
    
    # Zaključi in shrani PDF
    c.save()
    
    print(f"PDF uspešno generiran: {output_path}")
    return output_path




