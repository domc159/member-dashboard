"use client";
import React, { useState, useEffect } from 'react';
import styles from './Urejanje.module.css';

// Glavna komponenta za urejanje članov
const EditMemberLocalStorage = () => {
    // Začetna stanja za obrazec
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [memberData, setMemberData] = useState({
        ime: '',
        priimek: '',
        email: '',
        telefon: '',
        naslov: '',
        postna_stevilka: '',
        posta: '',
        fakulteta: '',
        studijski_program: '',
        letnik: '',
        status: '',
        id_clana: '',
        zadnje_leto_vpisa: ''
    });

    // Začetno stanje obrazca
    const initialFormData = {
        ime: '',
        priimek: '',
        email: '',
        telefon: '',
        naslov: '',
        postna_stevilka: '',
        posta: '',
        fakulteta: '',
        studijski_program: '',
        letnik: '',
        status: '',
        id_clana: '',
        zadnje_leto_vpisa: ''
    };
    const [formData, setFormData] = useState(initialFormData);

    // Stanja za upravljanje uporabniškega vmesnika
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Stanja za iskanje
    const [searchFirstName, setSearchFirstName] = useState('');
    const [searchLastName, setSearchLastName] = useState('');

    // Funkcija za spremljanje sprememb v obrazcu
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setMemberData(prev => ({ ...prev, [name]: value }));
    };

    // Funkcija za iskanje člana
    const handleSearch = async () => {
        setLoading(true);
        setError('');
        try {
            // Najprej pridobi sveže podatke iz API-ja
            const response = await fetch('https://api.datanexus.si/api/fullexport');
            if (!response.ok) {
                throw new Error('Napaka pri pridobivanju podatkov iz strežnika');
            }
            const freshData = await response.json();
            
            // Posodobi localStorage s svežimi podatki
            localStorage.setItem('apiDataVsiClani', JSON.stringify(freshData));
            
            // Poišči člana v svežih podatkih
            const foundMember = freshData.find((m: any) =>
                m.ime.toLowerCase() === searchFirstName.toLowerCase() &&
                m.priimek.toLowerCase() === searchLastName.toLowerCase()
            );
            
            if (foundMember) {
                setMemberData({
                    ime: foundMember.ime || '',
                    priimek: foundMember.priimek || '',
                    email: foundMember.email || '',
                    telefon: foundMember.telefon || '',
                    naslov: foundMember.naslov || '',
                    postna_stevilka: foundMember.postna_stevilka || '',
                    posta: foundMember.posta || '',
                    fakulteta: foundMember.fakulteta || '',
                    studijski_program: foundMember.studijski_program || '',
                    letnik: foundMember.letnik || '',
                    status: foundMember.status || '',
                    id_clana: foundMember.id_clana || '',
                    zadnje_leto_vpisa: foundMember.zadnje_leto_vpisa || ''
                });
            } else {
                setError('Član ni najden');
                setMemberData(initialFormData); // Ponastavi obrazec, če član ni najden
            }
        } catch (err) {
            setError('Napaka pri branju podatkov: ' + (err instanceof Error ? err.message : 'Neznana napaka'));
        }
        setLoading(false);
    };

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

    // Funkcija za shranjevanje sprememb
    const handleSave = async () => {
        try {
            // Najprej posodobi localStorage za trenutne člane
            const storedCurrentData = localStorage.getItem('apiDataTrenutniClani');
            if (storedCurrentData) {
                const currentMembers = JSON.parse(storedCurrentData);
                const index = currentMembers.findIndex((m: any) => m.id_clana === memberData.id_clana);
                if (index !== -1) {
                    currentMembers[index] = {
                        ...currentMembers[index],
                        ime: memberData.ime,
                        priimek: memberData.priimek,
                        email: memberData.email,
                        telefon: memberData.telefon,
                        naslov: memberData.naslov,
                        postna_stevilka: memberData.postna_stevilka,
                        posta: memberData.posta,
                        fakulteta: memberData.fakulteta,
                        studijski_program: memberData.studijski_program,
                        letnik: memberData.letnik,
                        status: memberData.status
                    };
                    localStorage.setItem('apiDataTrenutniClani', JSON.stringify(currentMembers));
                }
            }

            // Nato posodobi localStorage za vse člane
            const storedData = localStorage.getItem('apiDataVsiClani');
            if (storedData) {
                const members = JSON.parse(storedData);
                const index = members.findIndex((m: any) => m.id_clana === memberData.id_clana);
                if (index !== -1) {
                    members[index] = {
                        ...members[index],
                        ime: memberData.ime,
                        priimek: memberData.priimek,
                        email: memberData.email,
                        telefon: memberData.telefon,
                        naslov: memberData.naslov,
                        postna_stevilka: memberData.postna_stevilka,
                        posta: memberData.posta,
                        fakulteta: memberData.fakulteta,
                        studijski_program: memberData.studijski_program,
                        letnik: memberData.letnik,
                        status: memberData.status
                    };
                    localStorage.setItem('apiDataVsiClani', JSON.stringify(members));
                }
            }

            // Nato pošlji na strežnik
            const response = await fetch('https://api.datanexus.si/api/posodobiclana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberData)
            });

            if (!response.ok) {
                throw new Error('Napaka pri posodabljanju podatkov na strežniku');
            }

            setSuccess('Podatki uspešno posodobljeni v bazi in lokalnem pomnilniku');
            
            // Osveži stran po kratkem zamiku
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (err) {
            setError('Napaka pri posodabljanju: ' + (err instanceof Error ? err.message : 'Neznana napaka'));
        }
    };

    return (
        <>
            {error && <div className={`${styles.notification} ${styles.error}`}>{error}</div>}
            {success && <div className={`${styles.notification} ${styles.success}`}>{success}</div>}
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr', paddingRight: '20px'}}>
                <div style={{ textAlign: 'right', marginTop: '20px', marginRight: '10%' }}>
                    <a href="https://kssb.datanexus.dev/" 
                    rel="noopener noreferrer">
                    AJDE DOMU
                    </a>
                </div>
                <div style={{ justifyContent: 'center', textAlign: 'center', width: '30%', marginTop: '20px', margin: '0 auto' }}>
                    <div style={{ gridTemplateColumns: '1fr 1fr', marginTop: '20px', marginLeft: '20px' }}>
                        <div>
                            <table>
                                <thead>
                                    <tr>
                                        <th colSpan={2} style = {{width: '100%'}}>
                                            <h1 style = {{textAlign: 'center'}}>POIŠČI JOŽEJA</h1>                                  
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Ime:</td>
                                        <td>
                                            <input
                                                type="text"
                                                value={searchFirstName}
                                                onChange={(e) => {
                                                    if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]{0,50}$/.test(e.target.value)) {
                                                        setSearchFirstName(e.target.value)
                                                    }
                                                }}
                                                style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Priimek:</td>
                                        <td>
                                            <input
                                                type="text"
                                                value={searchLastName}
                                                onChange={(e) => {
                                                    if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]{0,50}$/.test(e.target.value)) {
                                                        setSearchLastName(e.target.value)
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSearch();
                                                    }
                                                }}
                                                style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} style = {{width: '100%'}}>
                                            <button onClick={handleSearch} disabled={loading} style={{width: '100%', height: '100%' }}>
                                                {loading ? 'Čaki malo salamo režem...' : 'Čuj ki si'}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {memberData.id_clana ? (
                        <div style={{ marginTop: '20px', marginLeft: '20px' }}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>Email:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name='email'
                                            value={memberData.email}
                                            onChange={handleChange}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Tel. št.:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="telefon"
                                            value={memberData.telefon}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^\d{0,9}$/.test(value)) {
                                                    handleChange(e);
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Naslov:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="naslov"
                                            value={memberData.naslov}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^[a-zA-Z0-9čšžćđČŠŽĆĐ.\s]{0,50}$/.test(value)) {
                                                    handleChange(e);
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Poštna št.:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="postna_stevilka"
                                            value={memberData.postna_stevilka}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^\d{0,4}$/.test(value)) {
                                                    handleChange(e);
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Pošta:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="posta"
                                            value={memberData.posta}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^[a-zA-ZčšžćđČŠŽĆĐ]{0,50}$/.test(value)) {
                                                    handleChange(e);
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Izobraževalna ustanova:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="fakulteta"
                                            value={memberData.fakulteta}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]{0,50}$/.test(value)) {
                                                    handleChange(e);
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Izobraževalni program:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="studijski_program"
                                            value={memberData.studijski_program}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (/^[a-zA-ZčšžćđČŠŽĆĐ\s]{0,50}$/.test(value)) {
                                                    handleChange(e);
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Letnik:</td>
                                        <td>
                                            <input
                                            type="text"
                                            name="letnik"
                                            value={memberData.letnik}
                                            onChange={(e) => {
                                                if (e.target.value === '' || /^[1-8]$/.test(e.target.value)) {
                                                    handleChange(e);
                                                }
                                            }}
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
                                            value={memberData.status}
                                            onChange={handleChange}
                                            required
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">/</option>
                                            <option value="študent">Študent</option>
                                            <option value="dijak">Dijak</option>
                                        </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} style = {{width: '100%'}}>
                                            <button onClick={handleSave} style={{ padding: '0.5rem 1rem', width: '100%' }}>
                                                Potrdi	
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : error ? (
                        <div style={{ marginTop: '20px'}}>
                            <h2>{error}</h2>
                        </div>
                    ) : (
                        null
                    )}
                </div>
            </div>

            <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
                <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
            </footer>
        </>
    );
};

export default EditMemberLocalStorage;