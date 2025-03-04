// page.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

const Page: React.FC = () => {
  const [bardayData, setBardayData] = useState<any>(null);
  const [barmonthData, setBarmonthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Base API URL
  const BASE_URL = "https://api.datanexus.si";

  // Fetch data from /api/barday/
  const fetchBardayData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/barday/`);
      setBardayData(JSON.parse(response.data));
    } catch (err: any) {
      setError("Napaka pri pridobivanju podatkov za barday.");
    }
  };

  // Fetch data from /api/barmonth/
  const fetchBarmonthData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/barmonth/`);
      setBarmonthData(JSON.parse(response.data));
    } catch (err: any) {
      setError("Napaka pri pridobivanju podatkov za barmonth.");
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchBardayData(), fetchBarmonthData()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <p>Čaki malo Joža salamo reže ...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <>
    <div style={{display: 'grid', gridTemplateColumns: '1fr', backgroundColor: "#252729", color: "#E4D7CA", padding: "20px" }}>
        <div style={{textAlign: 'left', marginLeft: '20px', marginTop: '20px'}}>
             <a href="https://kssb.datanexus.dev/" 
                style={{ textDecoration: 'underline' }}>
                  DOMOV
            </a>
        </div>
      {/* Barday Chart */}
    <div style={{height: "50vh" }}>
        {bardayData ? (
          <Plot
            data={bardayData.data}
            layout={{
              ...bardayData.layout,
              autosize: true,
              plot_bgcolor: "#252729",
              paper_bgcolor: "#252729",
              font: { color: "#E4D7CA" },
            }}
            config={{ responsive: true }}
          />
        ) : (
          <p>Ni podatkov za barday.</p>
        )}
      </div>
      {/* Barmonth Chart */}
      <div style={{marginBottom: '50px', height: "50vh", width: "100%" }}>
        {barmonthData ? (
          <Plot
            data={barmonthData.data}
            layout={{
              ...barmonthData.layout,
              autosize: true,
              plot_bgcolor: "#252729",
              paper_bgcolor: "#252729",
              font: { color: "#E4D7CA" },
            }}
            config={{ responsive: true }}
          />
        ) : (
          <p>Ni podatkov za barmonth.</p>
        )}
      </div>
    </div>
            <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
            <p>&copy; {new Date().getFullYear()} Domen Unuk -  MIT licence</p>
        </footer>
    </>
  );
};

export default Page;
