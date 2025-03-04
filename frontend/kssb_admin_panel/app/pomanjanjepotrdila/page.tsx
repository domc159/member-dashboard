"use client";

import React from 'react';

// Komponenta za prikaz sporočila o manjkajočem potrdilu
const PomankanjePotrdilaPage: React.FC = () => {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <h1 style={{ textAlign: 'center' }}>
                Vnešeno preko tes aplikacije. Verjetno imate potrdilo o vpisu in šolanju v fizični obliki na listu. Potrdilo o vpisu pa se je vseeno generiralo in ga pridobiš ob kliku na mail.
            </h1>
        </div>
    );
};

export default PomankanjePotrdilaPage;