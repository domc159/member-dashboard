FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first
COPY requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p \
    /home/database/KSSB_V2/dokumenti/pristopna_izjava \
    /home/database/KSSB_V2/dokumenti/potrdila_vpis \
    /home/database/KSSB_V2/dokumenti/potrdila_clanstvo \
    /home/database/KSSB_V2/temp \
    /home/database/pdf \
    /home/database/pdf_materjal \
    && chmod -R 755 /home/database

# Copy pdf_materjal directory
COPY pdf_materjal /app/pdf_materjal/

# Create necessary directories and set permissions
RUN mkdir -p /home/database/KSSB_V2/backend/pdf_materjal && \
    mkdir -p /home/database/KSSB_V2/dokumenti/pristopna_izjava && \
    mkdir -p /home/database/KSSB_V2/dokumenti/potrdila_vpis && \
    mkdir -p /home/database/KSSB_V2/dokumenti/potrdila_clanstvo && \
    mkdir -p /home/database/KSSB_V2/dokumenti/eservis && \
    mkdir -p /home/database/KSSB_V2/temp && \
    cp -r /app/pdf_materjal/* /home/database/KSSB_V2/backend/pdf_materjal/ && \
    chmod -R 755 /home/database/KSSB_V2

# Copy startup script and make it executable
COPY start.sh .
RUN chmod +x start.sh

# Expose port
EXPOSE 5000

# Set the startup script as the entrypoint
CMD ["./start.sh"] 