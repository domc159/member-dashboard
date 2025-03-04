"use client";

import React, { useEffect, useState } from 'react';
import styles from './Bilokdaj.module.css';

// Glavna komponenta za prikaz tabele podatkov
const DataTable = () => {
    // Definicija vmesnika za vrstico podatkov
    interface DataRow {
        id_clana: number;
        datum_vclanitve: string;
        processed_date: string;
        ime: string;
        priimek: string;
        potrdilo_url: string;
        vpis_url: string;
        clansko_potrdilo_url : string;
        fakulteta : string;
        studijski_program : string;
        letnik : string;
        status  : string;
        email : string;
        telefon : string;
        naslov : string;
        posta : string;
        postna_stevilka : string;
        datum_rojstva : string;
        leto_24_25 : string;
        zadnje_leto_vpisa : string;
        trenutno_leto : string;
    }
    
    // Stanja za upravljanje podatkov in uporabniškega vmesnika
    const [data, setData] = useState<DataRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    
    // Počisti obvestila po 3 sekundah
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Funkcija za pridobivanje podatkov iz API-ja
    const fetchData = async () => {
        try {
            const response = await fetch('https://api.datanexus.si/api/fullexport');
            const result = await response.json();
            setData(result);
            localStorage.setItem('apiDataVsiClani', JSON.stringify(result));
            setSuccess('Podatki uspešno posodobljeni');
        } catch (error) {
            setError('Napaka pri pridobivanju podatkov: ' + error);
            console.error('Napaka pri pridobivanju podatkov:', error);
        }
    };

    // Naloži podatke iz lokalnega shranjevanja ali API-ja ob zagonu
    useEffect(() => {
        const storedData = localStorage.getItem('apiDataVsiClani');
        if (storedData) {
            setData(JSON.parse(storedData));
        } else {
            fetchData();
        }
    }, []);

    // Funkcija za osvežitev podatkov
    const handleRefresh = () => {
        fetchData();
    };

    // Funkcija za obdelavo iskalnega niza
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    // Filtriranje podatkov glede na iskalni niz
    const filteredData = data.filter(row => {
        const searchString = searchTerm.toLowerCase();
        return (
            row.ime.toLowerCase().includes(searchString) ||
            row.priimek.toLowerCase().includes(searchString) ||
            row.email.toLowerCase().includes(searchString) ||
            row.telefon.toLowerCase().includes(searchString) ||
            row.naslov.toLowerCase().includes(searchString) ||
            row.postna_stevilka.toLowerCase().includes(searchString) ||
            row.posta.toLowerCase().includes(searchString) ||
            row.studijski_program.toLowerCase().includes(searchString) ||
            row.fakulteta.toLowerCase().includes(searchString) ||
            row.status.toLowerCase().includes(searchString) ||
            String(row.letnik).toLowerCase().includes(searchString) ||
            String(row.datum_rojstva).toLowerCase().includes(searchString) ||
            String(row.datum_vclanitve).toLowerCase().includes(searchString) ||
            String(row.leto_24_25).toLowerCase().includes(searchString)
        );
    });

    // Izpis podatkov v konzolo za debugiranje
    useEffect(() => {
        console.log('Vrstice podatkov:', data.map(row => ({
            trenutno_leto: row.trenutno_leto,
            zadnje_leto_vpisa: row.zadnje_leto_vpisa
        })));
    }, [data]);

    return (
            <>
            <div style={{display: 'grid', gridTemplateColumns: 'auto'}}>
                {error && <div className={`${styles.notification} ${styles.error}`}>{error}</div>}
                {success && <div className={`${styles.notification} ${styles.success}`}>{success}</div>}
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', justifyItems: 'center', marginTop: '30px', paddingBottom: '20px'}}>
                    <div style={{display: 'grid', alignItems: 'center', justifyItems: 'center'}}>
                        <button onClick={handleRefresh}>Osveži</button>
                        {data.length === 0 && <p>Nalaganje...</p>}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Išči..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <div style={{display: 'grid', alignItems: 'center', justifyItems: 'center'}}>
                        <button onClick={() => window.location.href = 'https://kssb.datanexus.dev/'}>AJDE DOMU</button>
                    </div>
                </div>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    {searchTerm && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Ime</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Priimek</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>E-pošta</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Telefon</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Naslov</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Poštna številka</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Pošta</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Študijski program</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Fakulteta</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Status</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Letnik</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Datum rojstva</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Datum včlanitve</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((row, index) => (
                                    <tr key={index} className={row.trenutno_leto === row.zadnje_leto_vpisa ? 'highlight-mismatch' : ''}>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.ime}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.priimek}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.email}</td> 
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.telefon}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.naslov}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.postna_stevilka}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.posta}</td>           
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.studijski_program}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.fakulteta}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.status}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.letnik}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.datum_rojstva}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.datum_vclanitve}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>     
                <div>
                    Število vseh članov: {filteredData.length}
                </div>           
                <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Ime</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Priimek</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>E-pošta</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Telefon</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Naslov</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Poštna številka</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Pošta</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Študijski program</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Fakulteta</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Status</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Letnik</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Datum rojstva</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Datum včlanitve</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index} className={row.trenutno_leto !== row.zadnje_leto_vpisa ? '' : 'highlight-mismatch'}>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.ime}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.priimek}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.email}</td> 
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.telefon}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.naslov}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.postna_stevilka}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.posta}</td>           
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.studijski_program}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.fakulteta}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.status}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.letnik}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.datum_rojstva}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.datum_vclanitve}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
                <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
            </footer>
        </>
    );
};

export default DataTable;
