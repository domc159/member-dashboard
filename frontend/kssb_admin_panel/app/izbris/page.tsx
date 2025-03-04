"use client";
import { useState, useEffect } from 'react';
import styles from './Izbris.module.css';

// Vmesnik za podatke člana
interface Clan {
  id_clana: string;
  email: string;
  // dodajte ostale lastnosti, če jih član ima
}

// Glavna komponenta za izbris člana
const IzbrisPage = () => {
  // Stanja za upravljanje obrazca in obvestil
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Počisti obvestila po 3 sekundah
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
        if (message.type === 'success') {
          window.location.reload();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Obdelava obrazca za izbris člana
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Pridobi podatke iz local storage
      const claniJson = localStorage.getItem('apiDataVsiClani');
      if (!claniJson) {
        setMessage({ type: 'error', text: 'Ni najdenih podatkov o članih' });
        return;
      }

      const clani: Clan[] = JSON.parse(claniJson);
      const clan = clani.find(c => c.email === email);

      if (!clan) {
        setMessage({ type: 'error', text: 'Član s tem emailom ne obstaja' });
        return;
      }

      // Pošlji zahtevo na API
      const response = await fetch('https://api.datanexus.si/api/izbris', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_clana: clan.id_clana })
      });

      if (!response.ok) {
        throw new Error('Napaka pri brisanju člana');
      }

      // Izbriši člana iz local storage
      const posodobljeniClani = clani.filter(c => c.id_clana !== clan.id_clana);
      localStorage.setItem('apiDataVsiClani', JSON.stringify(posodobljeniClani));

      setMessage({ type: 'success', text: 'Član je bil uspešno izbrisan' });
      setEmail(''); // Počisti vnosno polje
      
    } catch (error) {
      console.error('Napaka:', error);
      setMessage({ type: 'error', text: 'Prišlo je do napake pri brisanju člana' });
    }
  };

  return (
    <>
        {message.text && (
          <div className={`${styles.notification} ${message.type === 'success' ? styles.success : styles.error}`}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', marginTop: '20px' }}>
          <div></div>
          <div></div>
          <div style={{ display: 'grid', placeItems: 'right', marginRight: '5%' }}>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('https://api.datanexus.si/api/trenutni_clani');
                  const result = await response.json();
                  if (Array.isArray(result)) {
                    localStorage.setItem('apiDataTrenutniClani', JSON.stringify(result));
                  }
                  window.location.href = 'https://kssb.datanexus.dev/';
                } catch (error) {
                  console.error('Napaka pri posodobitvi podatkov:', error);
                  window.location.href = 'https://kssb.datanexus.dev/';
                }
              }}
              style={{width: '150px'}}
            >
              AJDE DOMU
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', placeItems: 'center', marginTop: '10%' }}>
          <div>
            <h1>&lt;=== Joža vun letiš ker sranje delaš ===&gt;</h1>
          </div>

          <div style={{marginLeft: '2.5%' }}> 
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', placeItems: 'center', marginTop: '10%' }} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
                <label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Vnesite email člana"
                  />
                </label>
                <button 
                  type="button"
                  onClick={() => {
                    const confirmBtn = document.getElementById('confirmDelete');
                    if (confirmBtn) {
                      confirmBtn.style.display = 'block';
                    }
                  }}
                >
                  Adijos Amigo
                </button>
                <div></div>
                <button 
                    id="confirmDelete" 
                    type="submit"
                    style={{display: 'none', marginTop: '10%'}}
                  >
                    zdaj pa res, idi vun
                </button>
            </form>    
          </div>
        </div>
    
        <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
                <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
        </footer>
    </>
  );
};

export default IzbrisPage;
