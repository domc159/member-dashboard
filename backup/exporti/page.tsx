"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExportiPage: React.FC = () => {
    const [unselectedNodes, setUnselectedNodes] = useState<string[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [exportClani, setExportClani] = useState(false);
    const [exportPotrdila, setExportPotrdila] = useState(false);
    const [exportSolanje, setExportSolanje] = useState(false);

    useEffect(() => {
        // Fetch the list of names from the API
        const fetchNames = async () => {
            try {
                const response = await axios.get('https://api.datanexus.si/api/selectexport/');
                setUnselectedNodes(response.data);
            } catch (error) {
                console.error('Error fetching names:', error);
            }
        };

        fetchNames();
    }, []);

    const handleMoveToSelected = () => {
        const selectedOptions = Array.from((document.getElementById('unselected-nodes') as HTMLSelectElement)?.selectedOptions || []).map(option => (option as HTMLOptionElement).value);
        setSelectedNodes([...selectedNodes, ...selectedOptions]);
        setUnselectedNodes(unselectedNodes.filter(node => !selectedOptions.includes(node)));
    };

    const handleMoveToUnselected = () => {
        const selectedOptions = Array.from((document.getElementById('selected-nodes') as HTMLSelectElement)?.selectedOptions || []).map(option => option.value);
        setUnselectedNodes([...unselectedNodes, ...selectedOptions]);
        setSelectedNodes(selectedNodes.filter(node => !selectedOptions.includes(node)));
    };

    const handleSubmit = async () => {
        if (!exportClani && !exportPotrdila && !exportSolanje) {
            alert('Izberite vsaj eno možnost za izvoz.');
            return;
        }

        const payload = {
            selectedNodes,
            clani: exportClani,
            vpisni_list: exportPotrdila,
            potrdilo: exportSolanje
        };

        try {
            const response = await axios.post('https://api.datanexus.si/api/selectedones/', payload, {
                responseType: 'blob',
                timeout: 120000, // Set timeout to 120 seconds
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'exported_files.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
            alert('Selected nodes submitted and file downloaded successfully');
        } catch (error) {
            if (axios.isAxiosError(error) && error.message === 'Network Error') {
                alert('Network error. Please check your internet connection and try again.');
            } else {
                console.error('Error submitting selected nodes:', error);
                alert('Error submitting selected nodes. Please try again later.');
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px' }}>
            <h1>Izberi padalce</h1>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <select id="unselected-nodes" multiple style={{ width: '150px', height: '200px' }}>
                    {unselectedNodes.map((node, index) => (
                        <option key={index} value={node}>{node}</option>
                    ))}
                </select>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={handleMoveToSelected}>&gt;&gt;</button>
                    <button onClick={handleMoveToUnselected}>&lt;&lt;</button>
                </div>
                <select id="selected-nodes" multiple style={{ width: '150px', height: '200px' }}>
                    {selectedNodes.map((node, index) => (
                        <option key={index} value={node}>{node}</option>
                    ))}
                </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label>
                    <input type="checkbox" checked={exportClani} onChange={() => setExportClani(!exportClani)} />
                    Export izbranih članov
                </label>
                <label>
                    <input type="checkbox" checked={exportPotrdila} onChange={() => setExportPotrdila(!exportPotrdila)} />
                    Export potrdil članov
                </label>
                <label>
                    <input type="checkbox" checked={exportSolanje} onChange={() => setExportSolanje(!exportSolanje)} />
                    Export potrdil o šolanju
                </label>
            </div>
            <button onClick={handleSubmit} style={{ marginTop: '20px' }}>Submit</button>
        </div>
    );
};

export default ExportiPage;
