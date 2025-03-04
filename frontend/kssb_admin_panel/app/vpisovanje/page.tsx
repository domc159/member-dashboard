"use client";

import React, { useState, useEffect } from 'react';
import styles from './Vpisovanje.module.css';

// Glavna komponenta za vpisovanje novih članov
const RegistrationForm = () => {
    // Začetno stanje obrazca
    const initialFormData = {
        id_clana: 0,
        datum_vclanitve: new Date().toISOString().split('T')[0],
        processed_date: new Date().toISOString(),
        ime: '',
        priimek: '',
        potrdilo_url: '',
        vpis_url: '',
        clansko_potrdilo_url: '',
        fakulteta: '',
        studijski_program: '',
        letnik: '',
        status: '',
        email: '',
        telefon: '',
        naslov: '',
        posta: '',
        postna_stevilka: '',
        datum_rojstva: '',
        trenutno_leto: '',
        zadnje_leto_vpisa : '',
    };

    // Stanja za upravljanje obrazca in obvestil
    const [formData, setFormData] = useState(initialFormData);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Počisti obvestila po 3 sekundah
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Funkcija za spremljanje sprememb v obrazcu
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Funkcija za oddajo obrazca
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Funkcija za formatiranje podatkov pred pošiljanjem
        const formatData = (data: typeof formData) => {
            const fieldsToCapitalize = ['ime','priimek','naslov','posta'];
            const updated: { [key: string]: any } = { ...data };
            for (let [key, value] of Object.entries(updated)) {
                if (typeof value === 'string') {
                    if (fieldsToCapitalize.includes(key)) {
                        updated[key] = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    } else {
                        updated[key] = value.toLowerCase();
                    }
                }
            }
            return updated;
        };

        const updatedFormData = formatData(formData);

        try {
            // Shrani v localStorage
            const existingData = localStorage.getItem('clani') || '[]';
            const parsedData = JSON.parse(existingData);
            parsedData.push(updatedFormData);
            localStorage.setItem('clani', JSON.stringify(parsedData));

            // Pošlji na API
            const response = await fetch('/api/novclan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedFormData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Član uspešno dodan!' });
                setFormData(initialFormData); // Ponastavi obrazec
            } else {
                const errorText = await response.text();
                console.error('Napaka strežnika:', errorText);
                throw new Error('Napaka pri pošiljanju podatkov');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Prišlo je do napake pri shranjevanju' });
            console.error('Napaka:', error);
        }
    };

    return (
        <>
            {message.text && (
                <div className={`${styles.notification} ${message.type === 'success' ? styles.success : styles.error}`}>
                    {message.text}
                </div>
            )}
            
            <div className="flex justify-center items-center min-h-screen p-4">
                <div className="w-full max-w-2xl" style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', paddingRight: '20px'}}>
                    <div></div>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' , width: '600px'}}>
                        <div></div>
                    <table>
                        <thead>
                            <tr>
                                <th colSpan={2} style = {{width: '100%'}}>
                                    <h1 style = {{textAlign: 'center'}}>ZACAJHNAJ TOTEGA PADALCA</h1>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>
                                Ime:
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name="ime"
                                    value={formData.ime}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]*$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Priimek:
                            </td>
                            <td>
                            <input
                                type="text"
                                name="priimek"
                                value={formData.priimek}
                                onChange={(e) => {
                                    const { name, value } = e.target;
                                    if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]*$/.test(value)) {
                                        handleChange(e);
                                    }
                                }}
                                required
                                style={{ width: '100%' }}
                            />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                E-pošta:
                            </td>
                            <td>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Telefon:</td>
                            <td>
                                <input
                                    type="tel"
                                    name="telefon"
                                    value={formData.telefon}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^\d{0,9}$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    maxLength={9}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Fakulteta:
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name="fakulteta"
                                    value={formData.fakulteta}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]*$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Program:
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name="studijski_program"
                                    value={formData.studijski_program}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]*$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Letnik:
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name="letnik"
                                    value={formData.letnik}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^[1-8]?$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Status:
                            </td>
                            <td>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="študent">Študent</option>
                                <option value="dijak">Dijak</option>
                            </select>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Naslov:
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name="naslov"
                                    value={formData.naslov}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^[a-zA-Z0-9čšžćđČŠŽĆĐ.\s]*$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Pošta:
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name="posta"
                                    value={formData.posta}
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]*$/.test(value)) {
                                            handleChange(e);
                                        }
                                    }}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Poštna številka:
                            </td>
                            <td>
                            <input
                                type="text"
                                name="postna_stevilka"
                                value={formData.postna_stevilka}
                                onChange={(e) => {
                                    const { name, value } = e.target;
                                    if (/^\d{0,4}$/.test(value)) {
                                        handleChange(e);
                                    }
                                }}
                                required
                                style={{ width: '100%' }}

                            />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Datum rojstva:
                            </td>
                            <td>
                                <input
                                    type="date"
                                    name="datum_rojstva"
                                    value={formData.datum_rojstva}
                                    onChange={handleChange}
                                    required
                                    style={{ width: '100%' }}

                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Šolsko leto:
                            </td>
                            <td>
                            <select
                                name="zadnje_leto_vpisa"
                                value={formData.zadnje_leto_vpisa}
                                onChange={handleChange}
                                required
                                style={{ width: '100%' }}

                            >
                                {(() => {
                                    const currentYear = new Date().getFullYear();
                                    const previous2Year = currentYear - 2;
                                    const previous1Year = currentYear - 1;
                                    const nextYear = currentYear + 1;
                                    return [
                                        `${previous1Year % 100}/${currentYear % 100}`,
                                        `${previous2Year % 100}/${previous1Year % 100}`,                                    
                                        `${currentYear % 100}/${nextYear % 100}`
                                    ].map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ));
                                })()}
                            </select>
                            </td>
                        </tr>
                        
                        <tr>
                            <td colSpan={2} style = {{width: '100%'}}>
                                <button type="submit" style={{ padding: '0.5rem 1rem', width: '100%' }}>
                                    Zacajhnaj škrata
                                </button>
                            </td>
                        </tr>
                    </tbody>
                    </table>

                    </form>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', alignItems: 'right', justifyItems: 'right' }}>
                        <div style={{ textAlign: 'center', marginTop: '20px', marginRight: '-500%' }}>
                            <a href="/" 
                                rel="noopener noreferrer">
                                AJDE DOMU
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <footer style={{ textAlign: 'center',position: 'fixed', marginTop: 'auto', bottom: '1px', width: '100%' }}>
                <p>&copy; {new Date().getFullYear()} Domen Unuk -  MIT licence</p>
            </footer>
        </>
    );
};

export default RegistrationForm;
