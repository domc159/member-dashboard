"use client";

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import { MdDownloadForOffline, MdOutlineDownloadForOffline, MdOutlineDownloading, MdArrowUpward, MdArrowDownward, MdHorizontalRule } from "react-icons/md";

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
        clansko_potrdilo_url: string;
        fakulteta: string;
        studijski_program: string;
        letnik: string;
        status: string;
        email: string;
        telefon: string;
        naslov: string;
        posta: string;
        postna_stevilka: string;
        datum_rojstva: string;
        leto_24_25: string;
    }
    
    // Ustvarjanje stanj za podatke, iskalni niz, napake, uspehe, polje za razvrščanje, smer razvrščanja in podatke za orodje
    const [data, setData] = useState<DataRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [sortField, setSortField] = useState<'ime' | 'priimek' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
    const [tooltipData, setTooltipData] = useState<{ x: number, y: number, data: DataRow | null }>({
        x: 0,
        y: 0,
        data: null
    });
    
    // Ločimo sortiranje za spodnjo tabelo
    const [mainTableSort, setMainTableSort] = useState<{
        field: 'ime' | 'priimek' | null,
        direction: 'asc' | 'desc' | null
    }>({ field: null, direction: null });
    
    // trajanje obvestila 4.5 sekunde
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Funkcija za pridobivanje podatkov iz API-ja
    const fetchData = async () => {
        try {
            const response = await fetch('/api/trenutni_clani');
            const result = await response.json();
            if (Array.isArray(result)) {
                setData(result);
                setSuccess('Podatki uspešno posodobljeni');
            } else {
                setData([]);
                setError('Napačen format prejetih podatkov');
            }
            localStorage.setItem('apiDataTrenutniClani', JSON.stringify(result));
        } catch (error) {
            setError('Napaka pri pridobivanju podatkov: ' + error);
            console.error('Napaka pri pridobivanju podatkov:', error);
        }
    };

    // Učinek za nalaganje podatkov iz lokalnega shranjevanja ali API-ja ob nalaganju komponente
    useEffect(() => {
        const storedData = localStorage.getItem('apiDataTrenutniClani');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData)) {
                setData(parsedData);
            } else {
                setData([]);
            }
        } else {
            fetchData();
        }

        // Background fetch for bilokdaj data
        const fetchBilokdajData = async () => {
            try {
                const response = await fetch('/api/fullexport');
                const result = await response.json();
                localStorage.setItem('apiDataVsiClani', JSON.stringify(result));
            } catch (error) {
                console.error('Error fetching bilokdaj data:', error);
            }
        };

        // Start background fetch after a short delay
        setTimeout(fetchBilokdajData, 3000);
    }, []);

    // Funkcija za osvežitev podatkov
    const handleRefresh = async () => {
        // First fetch current members data
        await fetchData();
        
        // Then fetch full export data
        try {
            const response = await fetch('/api/fullexport');
            const result = await response.json();
            localStorage.setItem('apiDataVsiClani', JSON.stringify(result));
            setSuccess('Vsi podatki uspešno posodobljeni');
        } catch (error) {
            console.error('Napaka pri pridobivanju celotnih podatkov:', error);
        }
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

    // Funkcija za formatiranje datuma
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('sl-SI');
    };

    // Funkcija za obdelavo dogodka ob vstopu miške na element
    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>, rowData: DataRow) => {
        setTooltipData({
            x: event.clientX,
            y: event.clientY,
            data: rowData
        });
    };

    // Funkcija za obdelavo dogodka ob izstopu miške iz elementa
    const handleMouseLeave = () => {
        setTooltipData({ x: 0, y: 0, data: null });
    };

    // Funkcija za razvrščanje podatkov
    const handleSort = (field: 'ime' | 'priimek') => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortDirection(null);
                setSortField(null);
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Funkcija za pridobivanje ikone za razvrščanje
    const getSortIcon = (field: 'ime' | 'priimek') => {
        if (sortField !== field) return <MdHorizontalRule style={{ color: '#d1995c' }} />;
        return sortDirection === 'asc' ? 
            <MdArrowDownward style={{ color: '#d1995c' }} /> : 
            sortDirection === 'desc' ? 
            <MdArrowUpward style={{ color: '#d1995c' }} /> : 
            <MdHorizontalRule style={{ color: '#d1995c' }} />;
    };

    // Razvrščanje podatkov glede na izbrano polje in smer
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortField || !sortDirection) return 0;
        
        const aValue = a[sortField].toLowerCase();
        const bValue = b[sortField].toLowerCase();
        
        if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });

    // Funkcija za sortiranje samo spodnje tabele
    const handleMainTableSort = (field: 'ime' | 'priimek') => {
        setMainTableSort(prev => {
            if (prev.field === field) {
                if (prev.direction === 'asc') {
                    return { field, direction: 'desc' };
                } else if (prev.direction === 'desc') {
                    return { field: null, direction: null };
                }
            }
            return { field, direction: 'asc' };
        });
    };

    // Ikona za spodnjo tabelo
    const getMainTableSortIcon = (field: 'ime' | 'priimek') => {
        if (mainTableSort.field !== field) return <MdHorizontalRule style={{ color: '#d1995c' }} />;
        return mainTableSort.direction === 'asc' ? 
            <MdArrowDownward style={{ color: '#d1995c' }} /> : 
            mainTableSort.direction === 'desc' ? 
            <MdArrowUpward style={{ color: '#d1995c' }} /> : 
            <MdHorizontalRule style={{ color: '#d1995c' }} />;
    };

    // Sortirani podatki samo za spodnjo tabelo
    const sortedMainData = React.useMemo(() => {
        if (!mainTableSort.field || !mainTableSort.direction) return data;
        
        return [...data].sort((a, b) => {
            const aValue = a[mainTableSort.field!].toLowerCase();
            const bValue = b[mainTableSort.field!].toLowerCase();
            
            if (mainTableSort.direction === 'asc') {
                return aValue.localeCompare(bValue, 'sl');
            } else {
                return bValue.localeCompare(aValue, 'sl');
            }
        });
    }, [data, mainTableSort]);

    return (
        <div className="container">
            {error && <div className={`${styles.notification} ${styles.error}`}>{error}</div>}
            {success && <div className={`${styles.notification} ${styles.success}`}>{success}</div>}
            
            {tooltipData.data && (
                <div style={{
                    position: 'fixed',
                    left: tooltipData.x + 10,
                    top: tooltipData.y + 10,
                    backgroundColor: '#252729',
                    border: '1px solid #d1995c',
                    padding: '10px',
                    borderRadius: '4px',
                    zIndex: 1000,
                    maxWidth: '600px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        <li>• Id clana: {tooltipData.data.id_clana}</li>
                        <li>• Ime: {tooltipData.data.ime}</li>
                        <li>• Priimek: {tooltipData.data.priimek}</li>
                        <li>• Email: {tooltipData.data.email}</li>
                        <li>• Telefon: {tooltipData.data.telefon}</li>
                        <li>• Naslov: {tooltipData.data.naslov}</li>
                        <li>• Poštna številka: {tooltipData.data.postna_stevilka}</li>
                        <li>• Pošta: {tooltipData.data.posta}</li>
                        <li>• Študijski program: {tooltipData.data.studijski_program}</li>
                        <li>• Fakulteta: {tooltipData.data.fakulteta}</li>
                        <li>• Status: {tooltipData.data.status}</li>
                        <li>• Letnik: {tooltipData.data.letnik}</li>
                        <li>• Datum rojstva: {formatDate(tooltipData.data.datum_rojstva)}</li>
                        <li>• Datum včlanitve: {formatDate(tooltipData.data.datum_vclanitve)}</li>
                        <li>• Datum obdelave: {formatDate(tooltipData.data.processed_date)}</li>

                    </ul>
                </div>
            )}
            
            <div style={{display: 'grid', gridTemplateColumns: 'auto', paddingRight: '20px', paddingLeft: '20px'}}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', alignItems: 'center', justifyItems: 'center'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', justifyItems: 'center'}}>
                        <div>
                            <button onClick={handleRefresh} style={{ marginBottom: '10px' }}>Naloži nanovo</button>
                            {data.length === 0 && <p>Počakaj Joža še reže salamo...</p>}
                        </div>
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Išči..."
                            value={searchTerm}
                            onChange={handleSearch}
                            style={{ marginBottom: '1px' }}
                        />
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', paddingRight: '20px', paddingTop: '10px'}}>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px'}}>
                            <a href="/vpisovanje" style={{ width: '100%' }}>
                            Zacajhnaj škrata
                            </a>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px' }}>
                            <a href="/urejanje" style={{ width: '100%' }}>
                            Popravi za Janezom
                            </a>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px'  }}>
                            <a href="/izbris" style={{ width: '100%' }}>
                            Nočem te videt
                            </a>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px' }}>
                            <a href="/statistika" style={{ width: '100%' }}>
                                    Statistika
                            </a>
                        </div>

                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px'  }}>
                            <a href="/download/aktivni_clani" style={{ width: '100%' }}>
                                Izpis kronikov
                            </a>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px' }}>
                            <button onClick={async () => {
                                try {
                                    const storedData = localStorage.getItem('apiDataTrenutniClani');
                                    if (!storedData) {
                                        setError('Ni podatkov za izvoz');
                                        return;
                                    }
                                    
                                    const allMembers = JSON.parse(storedData);
                                    const memberIds = filteredData.map(member => {
                                        const foundMember = allMembers.find((m: DataRow) => 
                                            m.ime === member.ime && m.priimek === member.priimek
                                        );
                                        return foundMember?.id_clana;
                                    }).filter(id => id);

                                    if (memberIds.length === 0) {
                                        setError('Ni izbranih članov za izvoz');
                                        return;
                                    }

                                    // Naredi API klic in začni prenos
                                    const response = await fetch('/api/search_result', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                                        },
                                        body: JSON.stringify({ ids: memberIds })
                                    });

                                    if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                    }

                                    // Direktno prenesi datoteko
                                    const blob = await response.blob();
                                    const downloadUrl = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = downloadUrl;
                                    link.download = 'izbrani_clani.xlsx';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(downloadUrl);
                                    
                                    setSuccess('Datoteka se prenaša');
                                    
                                } catch (error) {
                                    console.error('Error downloading file:', error);
                                    setError('Napaka pri prenosu datoteke');
                                }
                            }} style={{ width: '100%' }}>
                                Izbrani padalci
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px' }}>
                            <a href="/bilokdaj" style={{ width: '100%' }}>
                                    Vsi jožeji
                            </a>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: '10px', paddingRight: '10px', paddingLeft: '10px' }}>
                            <a href="/tasklist" style={{ width: '100%' }}>
                                    čuj porihtaj to
                            </a>
                        </div>
                    </div>
                </div>
                <div style={{ width: '100%', overflowX: 'auto' }}>

                    {searchTerm && (
                        <>
                        <div>
                            {filteredData.length > 0 ? (
                                <div>število razultatov: {filteredData.length}</div>
                            ) : (
                                <div style={{ color: '#8B0000', fontWeight: 'bold' }}>ni ujemanj z iskalnim nizom</div>
                            )}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>

                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span 
                                                style={{ cursor: 'pointer', userSelect: 'none' }} 
                                                onClick={() => handleSort('ime')}
                                            >
                                                {getSortIcon('ime')}
                                            </span>
                                            Ime
                                        </div>
                                    </th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span 
                                                style={{ cursor: 'pointer', userSelect: 'none' }} 
                                                onClick={() => handleSort('priimek')}
                                            >
                                                {getSortIcon('priimek')}
                                            </span>
                                            Priimek
                                        </div>
                                    </th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Email</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Tel. št.</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Naslov</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Poštna št.</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Pošta</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Študijski program</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Fakulteta</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Status</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Letnik</th>
                                    <th style={{ border: '1px solid black', padding: '8px' }}>Prenosi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((row, index) => (
                                    <tr key={index}>
                                        <td 
                                            style={{ border: '1px solid black', padding: '8px', cursor: 'pointer' }}
                                            onMouseEnter={(e) => handleMouseEnter(e, row)}
                                            onMouseLeave={handleMouseLeave}
                                        >{row.ime}</td>
                                        <td 
                                            style={{ border: '1px solid black', padding: '8px', cursor: 'pointer' }}
                                            onMouseEnter={(e) => handleMouseEnter(e, row)}
                                            onMouseLeave={handleMouseLeave}
                                        >{row.priimek}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.email}</td> 
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.telefon}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.naslov}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.postna_stevilka}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.posta}</td>           
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.studijski_program}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.fakulteta}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.status}</td>
                                        <td style={{ border: '1px solid black', padding: '8px' }}>{row.letnik}</td>
                                        <td style={{ border: '1px solid black', padding: '8px', width: '120px' }}>
                                        <a href={row.vpis_url} target="_blank" rel="noopener noreferrer" className="icon-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', padding: 0 }}>
                                            <MdDownloadForOffline style={{ width: '100%', height: '100%', color: '#d1995c' }} />
                                        </a>
                                        {(() => {
                                            if (!row.potrdilo_url || !row.vpis_url) {
                                                return false;
                                            }
                                            else {
                                                const potrdiloSegments = row.potrdilo_url.split('/').slice(-2);
                                                const vpisSegments = row.vpis_url.split('/').slice(-2);
                                                return potrdiloSegments.join('/') !== vpisSegments.join('/');
                                            }
                                        })() && (
                                            <a href={row.potrdilo_url} target="_blank" rel="noopener noreferrer" className="icon-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', padding: 0, marginLeft: '2px' }}>
                                                <MdOutlineDownloadForOffline style={{ width: '100%', height: '100%', color: '#d1995c' }} />
                                            </a>
                                        )}
                                        <a href={row.clansko_potrdilo_url} target="_blank" rel="noopener noreferrer" className="icon-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', padding: 0, marginLeft: '2px' }}>
                                            <MdOutlineDownloading style={{ width: '100%', height: '100%', color: '#d1995c' }} />
                                        </a>
                                    </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </>
                    )}
                </div>  
                <div style={{display: 'grid', gridTemplateColumns: '1fr 3fr', paddingTop: '10px'}}>
                    <div style={{display: 'grid', alignItems: 'left', justifyItems: 'left'}}>
                        število aktivnih članov: {data.length}
                    </div>    
                    <div style={{display: 'grid', alignItems: 'right', justifyItems: 'right'}}>
                    <p>info: črtica levo od ime in priimek je za sortiranje, znaki za prenos pa prenašajo dokumente v danem vrstnem redu od leve proti desni: vpisni list, potrdilo o šolanju in člansko potrdilo, v primeru da pa je prijava prišla preko eservisa pa je levi gumb za prenos eservis prijavnice desni pa potrdilo o vpisu</p>
                    </div> 
                </div>
                <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid black', padding: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span 
                                            style={{ cursor: 'pointer', userSelect: 'none' }} 
                                            onClick={() => handleMainTableSort('ime')}
                                        >
                                            {getMainTableSortIcon('ime')}
                                        </span>
                                        Ime
                                    </div>
                                </th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span 
                                            style={{ cursor: 'pointer', userSelect: 'none' }} 
                                            onClick={() => handleMainTableSort('priimek')}
                                        >
                                            {getMainTableSortIcon('priimek')}
                                        </span>
                                        Priimek
                                    </div>
                                </th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Email</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Tel. št.</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Naslov</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Poštna št.</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Pošta</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Študijski program</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Fakulteta</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Status</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Letnik</th>
                                <th style={{ border: '1px solid black', padding: '8px' }}>Prenosi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMainData.map((row, index) => (
                                <tr key={index}>
                                    <td 
                                        style={{ border: '1px solid black', padding: '8px', cursor: 'pointer' }}
                                        onMouseEnter={(e) => handleMouseEnter(e, row)}
                                        onMouseLeave={handleMouseLeave}
                                    >{row.ime}</td>
                                    <td 
                                        style={{ border: '1px solid black', padding: '8px', cursor: 'pointer' }}
                                        onMouseEnter={(e) => handleMouseEnter(e, row)}
                                        onMouseLeave={handleMouseLeave}
                                    >{row.priimek}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.email}</td> 
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.telefon}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.naslov}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.postna_stevilka}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.posta}</td>           
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.studijski_program}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.fakulteta}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.status}</td>
                                    <td style={{ border: '1px solid black', padding: '8px' }}>{row.letnik}</td>
                                    <td style={{ border: '1px solid black', padding: '8px', width: '120px' }}>
                                        <a href={row.vpis_url} target="_blank" rel="noopener noreferrer" className="icon-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', padding: 0 }}>
                                            <MdDownloadForOffline style={{ width: '100%', height: '100%', color: '#d1995c' }} />
                                        </a>
                                        {(() => {
                                            if (!row.potrdilo_url || !row.vpis_url) {
                                                return false;
                                            }
                                            else {
                                                const potrdiloSegments = row.potrdilo_url.split('/').slice(-2);
                                                const vpisSegments = row.vpis_url.split('/').slice(-2);
                                                return potrdiloSegments.join('/') !== vpisSegments.join('/');
                                            }
                                        })() && (
                                            <a href={row.potrdilo_url} target="_blank" rel="noopener noreferrer" className="icon-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', padding: 0, marginLeft: '2px' }}>
                                                <MdOutlineDownloadForOffline style={{ width: '100%', height: '100%', color: '#d1995c' }} />
                                            </a>
                                        )}
                                        <a href={row.clansko_potrdilo_url} target="_blank" rel="noopener noreferrer" className="icon-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', padding: 0, marginLeft: '2px' }}>
                                            <MdOutlineDownloading style={{ width: '100%', height: '100%', color: '#d1995c' }} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>
            </div>

            <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
                <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
            </footer>
        </div>
    );
};

export default DataTable;
