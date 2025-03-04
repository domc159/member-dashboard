-- Ustvari bazo, če še ne obstaja
CREATE DATABASE IF NOT EXISTS KSSB_V2;
USE KSSB_V2;

-- Prvi sestav tabel --

-- Tabela: clani
CREATE TABLE IF NOT EXISTS clani (
    id_clana INT AUTO_INCREMENT PRIMARY KEY,
    ime VARCHAR(255) NOT NULL,
    priimek VARCHAR(255) NOT NULL
);

-- Tabela: osebni_podatki
CREATE TABLE IF NOT EXISTS osebni_podatki (
    id_clana INT PRIMARY KEY,
    naslov VARCHAR(255) NOT NULL,
    posta VARCHAR(255) NOT NULL,
    postna_stevilka VARCHAR(10) NOT NULL,
    datum_rojstva DATE NOT NULL,
    FOREIGN KEY (id_clana) REFERENCES clani(id_clana)
);

-- Tabela: kontakti
CREATE TABLE IF NOT EXISTS kontakti (
    id_clana INT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    telefon VARCHAR(20) NOT NULL,
    FOREIGN KEY (id_clana) REFERENCES clani(id_clana)
);

-- Tabela: izobrazevanje
CREATE TABLE IF NOT EXISTS izobrazevanje (
    id_clana INT PRIMARY KEY,
    fakulteta VARCHAR(255) NOT NULL,
    studijski_program VARCHAR(255) NOT NULL,
    letnik INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_clana) REFERENCES clani(id_clana)
);

-- Tabela: dokumenti
CREATE TABLE IF NOT EXISTS dokumenti (
    id_clana INT PRIMARY KEY,
    potrdilo_url VARCHAR(255),
    vpis_url VARCHAR(255),
    clansko_potrdilo_url VARCHAR(255),
    FOREIGN KEY (id_clana) REFERENCES clani(id_clana)
);

-- Tabela: solsko_leto
CREATE TABLE IF NOT EXISTS solsko_leto (
    id_clana INT PRIMARY KEY,
    trenutno_leto VARCHAR(255),
    zadnje_leto_vpisa VARCHAR(255),
    FOREIGN KEY (id_clana) REFERENCES clani(id_clana)
);

-- Tabela: casovni_podatki
CREATE TABLE IF NOT EXISTS casovni_podatki (
    id_clana INT PRIMARY KEY,
    datum_vclanitve DATE NOT NULL,
    processed_date DATE NOT NULL,
    FOREIGN KEY (id_clana) REFERENCES clani(id_clana)
);

-- Drugi sestav tabel --

-- Tabela: Tasklist
CREATE TABLE IF NOT EXISTS Tasklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dodaj indekse za optimizacijo
ALTER TABLE clani ADD INDEX idx_ime_priimek (ime, priimek);
ALTER TABLE osebni_podatki ADD INDEX idx_postna_stevilka (postna_stevilka);
ALTER TABLE kontakti ADD INDEX idx_email (email);
ALTER TABLE izobrazevanje ADD INDEX idx_fakulteta_program (fakulteta, studijski_program);
ALTER TABLE Tasklist ADD INDEX idx_date (date); 