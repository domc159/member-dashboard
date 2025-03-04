"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Prijava() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nastavi cookie z geslom
    document.cookie = `auth=${password}; path=/`;

    // Preveri pravilnost gesla (osveži stran)
    router.push("/");
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
          <h1>Vnesite geslo</h1>
          <input
            type="password"
            placeholder="Geslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "8px", marginBottom: "10px", width: "200px" }}
          />
          <br />
          <button type="submit" style={{ padding: "8px 16px" }}>
            Prijava
          </button>
        </form>
      </div>

      <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
          <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
      </footer>
    </>
  );
}
