"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Function to generate a unique integer
function generateUniqueInt(): number {
    const currentTime = Date.now();
    const randomSalt = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const uniqueInput = `${currentTime}-${randomSalt}`;
    const hashBuffer = new TextEncoder().encode(uniqueInput);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    const uniqueInt = parseInt(hashHex, 16);
    return uniqueInt % 100_000_000;
}

const EditMemberPage = () => {
    const [memberData, setMemberData] = useState({
        id_clana: generateUniqueInt(), // Set unique integer as initial value
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
        datum_rojstva: '',
        datum_vclanitve: '',
        potrdilo_url: '/pomanjanjepotrdila/',
        processed_date: new Date().toLocaleString('en-GB', { timeZone: 'Europe/Ljubljana' }).slice(0, 19).replace('T', ' ')
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setMemberData((prevData) => ({
            ...prevData,
            id_clana: generateUniqueInt()
        }));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMemberData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSave = async () => {
        if (memberData) {
            try {
                await axios.post('https://api.datanexus.si/api/novclan/', memberData);
                alert('Member data updated successfully');
                window.location.reload();
            } catch (err) {
                alert('Error updating member data');
            }
        } else {
            alert('No member data to save');
        }
    };

    return (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', paddingRight: '20px' }}>
            <div></div>
            <div style={{ marginTop: '20px', marginLeft: '20px' }}>
                <table>
                    <tbody>
                        <tr>
                            <td>ID člana:</td>
                            <td>{memberData.id_clana}</td>
                        </tr>
                        <tr>
                            <td>Ime:</td>
                            <td>
                                <input
                                    type="text"
                                    name="ime"
                                    value={memberData.ime}
                                    onChange={handleChange}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Priimek:</td>
                            <td>
                                <input
                                    type="text"
                                    name="priimek"
                                    value={memberData.priimek}
                                    onChange={handleChange}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Email:</td>
                            <td>
                                <input
                                    type="email"
                                    name="email"
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
                                    onChange={handleChange}
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
                                    onChange={handleChange}
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
                                    onChange={handleChange}
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
                                    onChange={handleChange}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Rojstni dan:</td>
                            <td>
                                <input
                                    type="date"
                                    name="datum_rojstva"
                                    value={memberData.datum_rojstva}
                                    onChange={handleChange}
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
                                    onChange={handleChange}
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
                                    onChange={handleChange}
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
                                    onChange={handleChange}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td >Status:</td>
                            <td>
                                <input
                                    type="text"
                                    name="status"
                                    value={memberData.status}
                                    onChange={handleChange}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Datum včlanitve:</td>
                            <td>
                                <input
                                    type="date"
                                    name="datum_vclanitve"
                                    value={memberData.datum_vclanitve}
                                    onChange={handleChange}
                                    style={{ width: '100%' }}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
                <button onClick={handleSave}>Zacajhnaj Jožeja</button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', marginRight: '20px' }}>
                <a href="https://kssb.datanexus.dev/"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'underline' }}>
                    DOMOV
                </a>
            </div>
        </div>
        <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
            <p>&copy; {new Date().getFullYear()} Domen Unuk -  MIT licence</p>
        </footer>
        </>
    );
};

export default EditMemberPage;
