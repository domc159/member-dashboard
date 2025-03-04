"use client";

import React, { useState } from 'react';
import axios from 'axios';

const EditMemberPage = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [memberData, setMemberData] = useState<{
        ime: string;
        priimek: string;
        email: string;
        telefon: string;
        naslov: string;
        postna_stevilka: string;
        posta: string;
        fakulteta: string;
        studijski_program: string;
        letnik: number | string;
        status: string;
    }>({
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
        status: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('https://api.datanexus.si/api/izbiraclana', { firstName, lastName });
            if (response.data && !response.data.error) {
                setMemberData({
                    ime: response.data.ime || '',
                    priimek: response.data.priimek || '',
                    email: response.data.email || '',
                    telefon: response.data.telefon || '',
                    naslov: response.data.naslov || '',
                    postna_stevilka: response.data.postna_stevilka || '',
                    posta: response.data.posta || '',
                    fakulteta: response.data.fakulteta || '',
                    studijski_program: response.data.studijski_program || '',
                    letnik: response.data.letnik || '',
                    status: response.data.status || ''
                });
            } else {
                setError('Member not found');
            }
        } catch (err) {
            setError('Error fetching member data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMemberData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSave = async () => {
        if (memberData) {
            try {
                await axios.post('https://api.datanexus.si/api/updateclana', memberData);
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
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', paddingRight: '20px'}}>
            <div style={{ marginTop: '20px', marginLeft: '20px' }}>

            <div>
                <table>
                <tbody>
                    <tr>
                    <td>Ime:</td>
                    <td>
                    <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ width: '100%' }}

                    />
                    </td>
                    </tr>
                    <tr>
                    <td>Priimek:</td>
                    <td>
                    <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{ width: '100%' }}

                    />
                    </td>
                    </tr>
                </tbody>
                </table>
            </div>
            <button onClick={handleSearch} disabled={loading}>
                {loading ? 'Režem salamo počakaj...' : 'Joža, ki si'}
            </button>
            </div>
            {error && <p>{error}</p>}
            {memberData && (
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
                    <td>Status:</td>
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
                </tbody>
                </table>
                <button onClick={handleSave}>potrdi</button>
            </div>
            )}
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
