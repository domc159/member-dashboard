"use client";

import React, { useEffect, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { ChartData } from 'chart.js';
import 'chart.js/auto';
import Link from 'next/link';
import styles from './Statistika.module.css';

// Vmesnik za podatke člana
interface Member {
    datum_vclanitve: string;
    postna_stevilka: string;
    status?: string;
    letnik?: string;
    zadnje_leto_vpisa?: string;
}

// Vmesnik za štetje po poštnih številkah
interface PostalCounts {
    [key: string]: number;
}

// Vmesnik za štetje po šolskih letih
interface SchoolYearCounts {
    [key: string]: number;
}

// Privzeti podatki za tortni diagram
const defaultPieData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
    }]
};

// Privzeti podatki za stolpični diagram
const defaultBarData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
        label: '',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
    }]
};

// Komponenta za prikaz nalaganja
const LoadingChart = () => (
    <div className={styles.loadingContainer}>
        Nalaganje podatkov...
    </div>
);

// Glavna komponenta za prikaz statistike
const StatistikaPage = () => {
    // Stanja za različne grafe
    const [monthlyData, setMonthlyData] = useState<ChartData<'pie'>>(defaultPieData);
    const [postalData, setPostalData] = useState<ChartData<'pie'>>(defaultPieData);
    const [schoolYearData, setSchoolYearData] = useState<ChartData<'bar'>>(defaultBarData);
    const [statusData, setStatusData] = useState<ChartData<'pie'>>(defaultPieData);
    const [yearData, setYearData] = useState<ChartData<'pie'>>(defaultPieData);
    
    // Stanja za nalaganje
    const [loadingMonthly, setLoadingMonthly] = useState(true);
    const [loadingPostal, setLoadingPostal] = useState(true);
    const [loadingSchoolYear, setLoadingSchoolYear] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loadingYear, setLoadingYear] = useState(true);

    // Barve za grafe
    const chartColors = {
        primary: '#d1995c',    // osnovna zlato-rjava
        secondary: '#65584A',  // temna rjava
        accent1: '#90ac5e',    // olivno zelena
        accent2: '#5e7c8a',    // modro-siva
        accent3: '#8a5e7c',    // vijolično-rjava
        accent4: '#ac5e5e',    // rdečkasto-rjava
        accent5: '#5e8a7c',    // zeleno-modra
        accent6: '#7c8a5e',    // zeleno-rjava
    };

    // Nastavitve za tortne diagrame
    const pieChartOptions = {
        maintainAspectRatio: true,
        responsive: true,
        plugins: {
            legend: {
                position: 'right' as const,
                align: 'center' as const,
                labels: {
                    color: chartColors.primary,
                    font: {
                        family: 'Arial, Helvetica, sans-serif'
                    },
                    padding: 10
                }
            }
        },
        layout: {
            padding: {
                right: 20
            }
        }
    };

    // Nastavitve za stolpične diagrame
    const barChartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#414344'
                },
                ticks: {
                    color: chartColors.primary
                }
            },
            x: {
                grid: {
                    color: '#414344'
                },
                ticks: {
                    color: chartColors.primary
                }
            }
        }
    };

    useEffect(() => {
        // Najprej naloži iz lokalnega shranjevanja
        const loadFromLocalStorage = () => {
            const storedCurrentMembers = localStorage.getItem('apiDataTrenutniClani');
            const storedAllMembers = localStorage.getItem('apiDataVsiClani');

            if (storedCurrentMembers) {
                processCurrentMembers(JSON.parse(storedCurrentMembers));
            }
            if (storedAllMembers) {
                processAllMembers(JSON.parse(storedAllMembers));
            }
        };

        // Posodobi iz API-jev v ozadju
        const updateFromAPIs = async () => {
            try {
                // Pridobi trenutne člane
                const currentResponse = await fetch('/api/trenutni_clani');
                const currentData = await currentResponse.json();
                localStorage.setItem('apiDataTrenutniClani', JSON.stringify(currentData));

                // Pridobi vse člane
                const allResponse = await fetch('/api/fullexport');
                const allData = await allResponse.json();
                localStorage.setItem('apiDataVsiClani', JSON.stringify(allData));

                // Po posodobitvi lokalnega shranjevanja ponovno naloži podatke
                const storedCurrentMembers = localStorage.getItem('apiDataTrenutniClani');
                const storedAllMembers = localStorage.getItem('apiDataVsiClani');

                if (storedCurrentMembers) {
                    processCurrentMembers(JSON.parse(storedCurrentMembers));
                }
                if (storedAllMembers) {
                    processAllMembers(JSON.parse(storedAllMembers));
                }
            } catch (error) {
                console.error('Napaka pri posodabljanju podatkov iz API-jev:', error);
            }
        };

        // Obdelaj podatke trenutnih članov
        const processCurrentMembers = (currentMembers: Member[]) => {
            // Pripravi podatke za mesečni tortni diagram
            const months = [
                'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
                'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
            ];
            const monthlyCounts = new Array(12).fill(0);
            currentMembers.forEach((member: Member) => {
                const month = new Date(member.datum_vclanitve).getMonth();
                monthlyCounts[month]++;
            });
            setMonthlyData({
                labels: months,
                datasets: [{
                    data: monthlyCounts,
                    backgroundColor: [
                        chartColors.primary,
                        chartColors.secondary,
                        chartColors.accent1,
                        chartColors.accent2,
                        chartColors.accent3,
                        chartColors.accent4,
                        chartColors.accent5,
                        chartColors.accent6,
                        chartColors.primary,
                        chartColors.secondary,
                        chartColors.accent1,
                        chartColors.accent2
                    ]
                }]
            });
            setLoadingMonthly(false);

            // Pripravi podatke za tortni diagram poštnih številk
            const postalCounts: PostalCounts = {};
            currentMembers.forEach((member: Member) => {
                const postalCode = member.postna_stevilka;
                postalCounts[postalCode] = (postalCounts[postalCode] || 0) + 1;
            });
            setPostalData({
                labels: Object.keys(postalCounts),
                datasets: [{
                    data: Object.values(postalCounts),
                    backgroundColor: Object.keys(postalCounts).map((_, index) => 
                        Object.values(chartColors)[index % Object.keys(chartColors).length]
                    )
                }]
            });
            setLoadingPostal(false);

            // Pripravi podatke za tortni diagram statusov
            const statusCounts = {
                'Študent': 0,
                'Dijak': 0,
                'Neoznačeno': 0
            };

            console.log('Obdelava statusov:', currentMembers.map(m => m.status));

            currentMembers.forEach((member: Member) => {
                if (!member.status || member.status.trim() === '') {
                    statusCounts['Neoznačeno']++;
                    return;
                }

                const memberStatus = member.status.toLowerCase().trim();
                console.log('Obdelava statusa:', memberStatus);

                if (memberStatus === 'študent' || memberStatus === 'student') {
                    statusCounts['Študent']++;
                } else if (memberStatus === 'dijak') {
                    statusCounts['Dijak']++;
                } else {
                    console.log('Neprepoznan status:', member.status);
                    statusCounts['Neoznačeno']++;
                }
            });

            console.log('Končno število po statusih:', statusCounts);

            setStatusData({
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        chartColors.accent1,
                        chartColors.accent2,
                        chartColors.accent3
                    ]
                }]
            });
            setLoadingStatus(false);

            // Prepare data for year pie chart
            type YearCount = {
                '1': number;
                '2': number;
                '3': number;
                '4': number;
                '5': number;
                '6': number;
                '7': number;
                '8': number;
                'Neoznačeno': number;
            };

            const yearCounts: YearCount = {
                '1': 0,
                '2': 0,
                '3': 0,
                '4': 0,
                '5': 0,
                '6': 0,
                '7': 0,
                '8': 0,
                'Neoznačeno': 0
            };

            console.log('Processing years:', currentMembers.map(m => m.letnik)); // Debug log


            setYearData({
                labels: Object.keys(yearCounts).map(year => year === 'Neoznačeno' ? year : `${year}. letnik`),
                datasets: [{
                    data: Object.values(yearCounts),
                    backgroundColor: [
                        chartColors.primary,
                        chartColors.secondary,
                        chartColors.accent1,
                        chartColors.accent2,
                        chartColors.accent3,
                        chartColors.accent4,
                        chartColors.accent5,
                        chartColors.accent6,
                        chartColors.primary
                    ]
                }]
            });
            setLoadingYear(false);
        };

        const processAllMembers = (allMembers: Member[]) => {
            // Prepare data for school year bar chart
            const schoolYearCounts: SchoolYearCounts = {};
            allMembers.forEach((member: Member) => {
                if (!member.zadnje_leto_vpisa) return;
                
                const schoolYear = member.zadnje_leto_vpisa;
                schoolYearCounts[schoolYear] = (schoolYearCounts[schoolYear] || 0) + 1;
            });
            
            const sortedSchoolYears = Object.keys(schoolYearCounts).sort();
            setSchoolYearData({
                labels: sortedSchoolYears,
                datasets: [{
                    label: 'Število vpisanih članov',
                    data: sortedSchoolYears.map(year => schoolYearCounts[year]),
                    backgroundColor: chartColors.primary,
                    borderColor: chartColors.secondary,
                    borderWidth: 1
                }]
            });
            setLoadingSchoolYear(false);
        };

        // First load from localStorage
        loadFromLocalStorage();

        // Then update from APIs in background
        updateFromAPIs();
    }, []);

    return (
        <>
            <div className={styles.container}>
                <div className={styles.headerContainer}>
                    <button onClick={() => window.location.href = '/'}>
                        AJDE DOMU
                    </button>
                </div>
                
                <div className={styles.chartsContainer}>
                    <div className={styles.topChartsGrid}>
                        <div className={styles.chartBox}>
                            <h2 className={styles.chartTitle}>Vpis članov po mesecih</h2>
                            <div className={styles.chartContainer}>
                                {loadingMonthly ? <LoadingChart /> : 
                                    <div className={styles.pieChartContainer}>
                                        <Pie 
                                            data={monthlyData} 
                                            options={pieChartOptions}
                                        />
                                    </div>
                                }
                            </div>
                        </div>
                        <div className={styles.chartBox}>
                            <h2 className={styles.chartTitle}>Število članov po poštnih številkah</h2>
                            <div className={styles.chartContainer}>
                                {loadingPostal ? <LoadingChart /> : 
                                    <div className={styles.pieChartContainer}>
                                        <Pie 
                                            data={postalData} 
                                            options={pieChartOptions}
                                        />
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div className={styles.bottomChartsGrid}>
                        <div className={styles.chartBox}>
                            <h2 className={styles.chartTitle}>Status članov</h2>
                            <div className={styles.chartContainer}>
                                {loadingStatus ? <LoadingChart /> : 
                                    <div className={styles.pieChartContainer}>
                                        <Pie 
                                            data={statusData} 
                                            options={pieChartOptions}
                                        />
                                    </div>
                                }
                            </div>
                        </div>
                        
                        <div className={styles.chartBox}>
                            <h2 className={styles.chartTitle}>Število vpisanih članov na šolsko leto</h2>
                            <div className={styles.chartContainer}>
                                {loadingSchoolYear ? <LoadingChart /> : 
                                    <Bar
                                        data={schoolYearData}
                                        options={barChartOptions}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer style={{ textAlign: 'center', marginTop: 'auto', position: 'fixed', bottom: '20px', width: '100%' }}>
            <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
            </footer>
        </>
    );
};

export default StatistikaPage;
