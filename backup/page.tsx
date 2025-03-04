// components/WebSocketConnection.tsx
"use client";
import { useEffect, useState } from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from 'react-super-responsive-table';
import 'react-super-responsive-table/dist/SuperResponsiveTableStyle.css';
import axios from 'axios';


interface TableData {
  ime: string;
  priimek: string;
  datum_rojstva: string;
  email: string;
  telefon: string;
  naslov: string;
  posta: string;
  postna_stevilka: string;
  fakulteta: string;
  studijski_program: string;
  letnik: string;	
  status: string;
  datum_vclanitve: string;
  potrdilo_url: string;
  vpis_url: string;
}

export default function WebSocketConnection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<TableData[]>([]);
  const [searchResults, setSearchResults] = useState<TableData[]>([]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
        const response = await axios.post('https://api.datanexus.si/api/search/', { query: searchTerm }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 200) {
            setSearchResults(response.data);
        } else {
            console.error('Search API returned non-200 status:', response.status);
        }
    } catch (error) {
        console.error('Error searching:', error);
    }
};

const fetchSearchResults = async () => {
    try {
        const response = await axios.get('https://api.datanexus.si/api/results/');
        setSearchResults(response.data);
    } catch (error) {
        console.error('Error fetching search results:', error);
    }
};

useEffect(() => {
    fetchSearchResults();
}, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://api.datanexus.si/api/clani/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);
  
  return (
    <>
      <div style={{display: 'grid', gridTemplateColumns: 'auto auto auto'}}>
       <div style={{display: 'grid', gridTemplateColumns: 'auto auto'}}>
          <div style={{textAlign: 'right', paddingTop: '20px', paddingLeft: '20px', fontSize: '40px', fontWeight: 'bold'}}>
            <h1 
              onMouseEnter={(e) => {
              const tooltip = document.createElement('div');
              tooltip.id = 'tooltip';
              tooltip.style.position = 'absolute';
              tooltip.style.backgroundColor = '#25272900';
              tooltip.style.padding = '0px';
              tooltip.style.zIndex = '1000';
              tooltip.style.fontSize = '30px';
              tooltip.innerText = 'Čuj vijim te';
              document.body.appendChild(tooltip);
              const updateTooltipPosition = (event: MouseEvent) => {
              tooltip.style.left = `${event.pageX + 10}px`;
              tooltip.style.top = `${event.pageY + 10}px`;
              };
              document.addEventListener('mousemove', updateTooltipPosition);
              e.currentTarget.onmouseleave = () => {
              document.body.removeChild(tooltip);
              document.removeEventListener('mousemove', updateTooltipPosition);
              };
              }}
            >
              Big Brother
            </h1>
          </div>
          <div style={{textAlign: 'right', paddingTop: '40px', fontSize: '20px', fontWeight: 'bold'}}>
             <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
               rel="noopener noreferrer"
               style={{ textDecoration: 'underline' }}>
                če nucaš pomoč
              </a>
          </div>
        </div>
        <div style={{ paddingTop: '30px', marginLeft: '150px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Jouža..."
            />
            <button type="submit">Čuj tu sn</button>
          </form>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'auto auto auto', paddingRight: '20px'}}>
        <div style={{ textAlign: 'center', paddingTop: '30px' }}>
            <a href="https://kssb.datanexus.dev/vpisovanje" 
                style={{ textDecoration: 'underline' }}>
            Zacajhnaj škrata
                </a>
            </div>
          <div style={{ textAlign: 'center', paddingTop: '30px' }}>
            <a href="https://kssb.datanexus.dev/urejanje" 
                style={{ textDecoration: 'underline' }}>
            Popravi za Jožejom
                </a>
            </div>
          <div style={{ textAlign: 'center', paddingTop: '30px' }}>
            <a href="https://kssb.datanexus.dev/izbris" 
                style={{ textDecoration: 'underline' }}>
            Nočem te videt
                </a>
            </div>
            <div style={{ textAlign: 'center', paddingTop: '30px' }}>
              <a href="https://kssb.datanexus.dev/statistika"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}>
                    Statistika
              </a>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '30px' }}>
            <a href="https://api.datanexus.si/download/clani" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline' }}>
                  Izpis kronikov
                </a>
          </div>
            <div style={{ textAlign: 'center', paddingTop: '30px'  }}>
            <a href="https://kssb.datanexus.dev/exporti" 
               rel="noopener noreferrer"
               style={{ textDecoration: 'underline' }}>
                Izberi padalce
              </a>
            </div>
          </div>
      </div>

      <div style={{ height: 'auto', marginTop: 'auto', paddingLeft: '20px', paddingRight:'20px', paddingTop: '10px'  }}>
        <h3>Izbrani padalci: {searchResults.length}</h3>
        {(() => {
          if (searchResults.length > 0 && searchResults.length !== data.length && searchTerm !== '') {
            return (
              <Table>
          <Thead>
            <Tr>
              <Th>Ime</Th>
              <Th>Priimek</Th>
              <Th>Naslov</Th>
              <Th>Poštna št.</Th>
              <Th>Pošta</Th>
              <Th>Izobraževalni porogram</Th>
              <Th>Letnik</Th>
              <Th>Ustanova</Th>
              <Th>Status</Th>
              <Th>Včlanitev</Th>
              <Th>Datum rojstva</Th>
              <Th>E-naslov</Th>
              <Th>Tel. številka</Th>
            </Tr>
          </Thead>
          <Tbody>
            {searchResults.map((result, index) => (
              <Tr key={index}>
                <Td><a href={result.potrdilo_url} download>{result.ime}</a></Td>
                <Td><a href={result.potrdilo_url} download>{result.priimek}</a></Td>
                <Td>{result.naslov}</Td>
                <Td>{result.postna_stevilka}</Td>
                <Td>{result.posta}</Td>
                <Td>{result.studijski_program}</Td>
                <Td>{result.letnik}</Td>
                <Td>{result.fakulteta}</Td>
                <Td>{result.status}</Td>
                <Td>{result.datum_vclanitve}</Td>
                <Td>{result.datum_rojstva}</Td>
                <Td><a href={result.vpis_url} download>{result.email}</a></Td>
                <Td>{result.telefon}</Td>
              </Tr>
            ))}
          </Tbody>
              </Table>
            )
          } else {
            return (
              <Table>
          <Thead>
            <Tr>
              <Th>Vsi še stojijo ...</Th>
            </Tr>
          </Thead>
              </Table>
            )
          }
        })()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto',}}>
        <div style={{ textAlign: 'left', paddingTop: '30px', paddingLeft: '20px' }}>
                <div>
                  <p>Število kronikov: {data.length}</p>
                </div>
        </div>
        <div style={{ textAlign: 'right', paddingTop: '30px', paddingRight: '20px' }}>
          <p>Do potrdila o vpisu dostopaš preko klika na ime ali priimek, potrdilo o vpisu pa je dostopno preko klika na e-mail. P.S. stiskaš lahko vse bug == feature</p>
        </div>
      </div>
      <div style={{ height: 'auto', marginTop: 'auto', paddingLeft: '20px', paddingRight:'20px', paddingTop: '10px' }}>

        <Table>
          <Thead>
            <Tr>
            <Th>Ime</Th>
            <Th>Priimek</Th>
            <Th>Naslov</Th>
            <Th>Poštna št.</Th>
            <Th>Pošta</Th>
            <Th>Izobraževalni porogram</Th>
            <Th>Letnik</Th>
            <Th>Ustanova</Th>
            <Th>Status</Th>
            <Th>Včlanitev</Th>
            <Th>Datum rojstva</Th>
            <Th>E-naslov</Th>
            <Th>Tel. številka</Th>
          </Tr>
          </Thead>
          <Tbody>
            {data.map((result, index) => (
              <Tr key={index}>
                    <Td><a href={result.potrdilo_url} download>{result.ime}</a></Td>
                    <Td><a href={result.potrdilo_url} download>{result.priimek}</a></Td>
                  <Td>{result.naslov}</Td>
                  <Td>{result.postna_stevilka}</Td>
                  <Td>{result.posta}</Td>
                  <Td>{result.studijski_program}</Td>
                  <Td>{result.letnik}</Td>
                  <Td>{result.fakulteta}</Td>
                  <Td>{result.status}</Td>
                  <Td>{result.datum_vclanitve}</Td>
                  <Td>{result.datum_rojstva}</Td>
                  <Td><a href={result.vpis_url} download>{result.email}</a></Td>
                  <Td>{result.telefon}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
      <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '0px', width: '100%', backgroundColor: '#252729' }}>
        <p>&copy; {new Date().getFullYear()} Domen Unuk -  MIT licence</p>
      </footer>
    </>
  );
}


