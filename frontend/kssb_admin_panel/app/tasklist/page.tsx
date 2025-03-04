'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './TaskList.module.css';

// Vmesnik za posamezno nalogo
interface Task {
  id: number;
  content: string;
  completed: boolean;
}

// Vmesnik za tabelo nalog
interface TaskTable {
  date: string;
  tasks: Task[];
  isSaved: boolean;
  lastSavedWithAllCompleted: boolean;
}

export default function TaskList() {
  // Stanja za upravljanje podatkov in uporabniškega vmesnika
  const [tables, setTables] = useState<TaskTable[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);

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

  // Sinhronizacija podatkov iz API-ja v localStorage ob zagonu komponente
  useEffect(() => {
    const syncData = async () => {
      try {
        setIsRefreshing(true);
        const response = await fetch('/api/tasksynch');
        if (!response.ok) {
          throw new Error('Napaka pri pridobivanju nalog');
        }
        const data = await response.json();
        // Add isSaved property and check completion for each table
        const tablesWithSaved = data.map((table: TaskTable) => {
          const nonEmptyTasks = table.tasks.slice(0, -1).filter(task => task.content.trim() !== '');
          const allTasksCompleted = nonEmptyTasks.length > 0 && nonEmptyTasks.every(task => task.completed);
          return {
            ...table,
            isSaved: true,
            lastSavedWithAllCompleted: allTasksCompleted
          };
        });
        setTables(tablesWithSaved);
        localStorage.setItem('TaskList', JSON.stringify(tablesWithSaved));
        setSuccess('Uspešno sinhronizirano z bazo podatkov');
      } catch (err) {
        setError('Napaka pri sinhronizaciji nalog: ' + (err instanceof Error ? err.message : String(err)));
        console.error('Napaka pri sinhronizaciji podatkov:', err);
      } finally {
        setIsRefreshing(false);
      }
    };

    syncData();
  }, []);

  // Shrani tabele v localStorage ob vsaki spremembi
  useEffect(() => {
    localStorage.setItem('TaskList', JSON.stringify(tables));
  }, [tables]);

  // Osveži tabele iz API-ja
  const refreshTables = async () => {
    try {
      setIsRefreshing(true);
      setError('');
      
      const response = await fetch('/api/tasksynch');
      if (!response.ok) {
        throw new Error('Napaka pri pridobivanju nalog');
      }
      
      const data = await response.json();
      // Add isSaved property and check completion for each table
      const tablesWithSaved = data.map((table: TaskTable) => {
        const nonEmptyTasks = table.tasks.slice(0, -1).filter(task => task.content.trim() !== '');
        const allTasksCompleted = nonEmptyTasks.length > 0 && nonEmptyTasks.every(task => task.completed);
        return {
          ...table,
          isSaved: true,
          lastSavedWithAllCompleted: allTasksCompleted
        };
      });
      setTables(tablesWithSaved);
      localStorage.setItem('TaskList', JSON.stringify(tablesWithSaved));
      setSuccess('Uspešno sinhronizirano z bazo podatkov');
    } catch (err) {
      setError('Napaka pri osveževanju nalog: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ustvari novo tabelo za današnji dan
  const createNewTable = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Preveri, če tabela za danes že obstaja
    const existingTable = tables.find(table => table.date === today);
    if (existingTable) {
      setError('Tabela za danes že obstaja. Prosimo, uredite obstoječo tabelo.');
      // Premakni pogled na obstoječo tabelo
      const tableElement = document.querySelector(`[data-date="${today}"]`);
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const newTable: TaskTable = {
      date: today,
      tasks: [{ id: 1, content: '', completed: false }],
      isSaved: false,
      lastSavedWithAllCompleted: false
    };

    setTables([...tables, newTable]);
    setSuccess('Nova dnevna tabela ustvarjena');
  };

  // Dodaj novo vrstico v tabelo
  const addRow = (tableDate: string) => {
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.date === tableDate) {
          const newTask = {
            id: table.tasks.length + 1,
            content: '',
            completed: false
          };
          return { ...table, tasks: [...table.tasks, newTask] };
        }
        return table;
      });
    });
  };

  // Posodobi vsebino naloge
  const updateTask = (tableDate: string, taskId: number, content: string) => {
    // Dovoli slovenske črke (čšž), angleške črke, številke in osnovna ločila
    const sanitizedContent = content.replace(/[^a-zA-ZčČšŠžŽđĐćĆ0-9\s.,!?-]/g, '');
    
    if (sanitizedContent.length > 250) {
      setError('Vsebina naloge ne sme presegati 250 znakov');
      return;
    }

    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.date === tableDate) {
          const updatedTasks = table.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, content: sanitizedContent };
            }
            return task;
          });
          return { ...table, tasks: updatedTasks };
        }
        return table;
      });
    });
    setError('');
  };

  // Preklopi stanje dokončanosti naloge
  const toggleTaskComplete = (tableDate: string, taskId: number) => {
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.date === tableDate) {
          const updatedTasks = table.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: !task.completed };
            }
            return task;
          });
          return { ...table, tasks: updatedTasks };
        }
        return table;
      });
    });
  };

  // Filtriraj in sortiraj tabele
  const getFilteredTables = () => {
    let filtered = [...tables];

    // Najprej uporabi datumske filtre, če obstajajo
    if (fromDate && toDate) {
      filtered = filtered.filter(table => 
        table.date >= fromDate && table.date <= toDate
      );
    }

    // Nato filtriraj po stanju dokončanosti, če je hideCompleted true
    if (hideCompleted) {
      filtered = filtered.filter(table => !isTableCompleted(table));
    }

    // Sortiraj po datumu padajoče
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  };

  // Shrani tabelo v bazo
  const saveTable = async (table: TaskTable) => {
    try {
      const nonEmptyTasks = table.tasks.slice(0, -1).filter(task => task.content.trim() !== '');
      const allTasksCompleted = nonEmptyTasks.length > 0 && nonEmptyTasks.every(task => task.completed);
      
      const data: any = {
        id_tabele: table.date,
      };

      nonEmptyTasks.forEach((task, index) => {
        const taskNumber = index + 1;
        data[`task${taskNumber}`] = task.content;
        data[`status${taskNumber}`] = task.completed;
      });

      const response = await fetch('/api/dailytask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Napaka pri shranjevanju nalog');
      }

      setTables(prevTables => 
        prevTables.map(t => {
          if (t.date === table.date) {
            return {
              ...t,
              tasks: [...nonEmptyTasks, { id: nonEmptyTasks.length + 1, content: '', completed: false }],
              isSaved: true,
              lastSavedWithAllCompleted: allTasksCompleted
            };
          }
          return t;
        })
      );

      setSuccess('Naloge uspešno shranjene');
    } catch (err) {
      setError('Napaka pri shranjevanju nalog: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Preveri, če so vse naloge v tabeli dokončane
  const isTableCompleted = (table: TaskTable) => {
    const nonEmptyTasks = table.tasks.slice(0, -1).filter(task => task.content.trim() !== '');
    const allTasksCompleted = nonEmptyTasks.length > 0 && nonEmptyTasks.every(task => task.completed);
    // Tabela je končana samo če:
    // 1. Ima vsaj eno nalogo
    // 2. Vse naloge so označene kot končane
    // 3. Tabela je bila shranjena PO tem, ko so bile vse naloge označene kot končane
    return allTasksCompleted && table.lastSavedWithAllCompleted;
  };

  return (
    <>
      <div>
        {error && <div className={`${styles.notification} ${styles.error}`}>{error}</div>}
        {success && <div className={`${styles.notification} ${styles.success}`}>{success}</div>}
        
        <div className={styles.headerButtons}>
          <button className={styles.homeButton} onClick={() => window.location.href = '/'}>
            AJDE DOMU
          </button>
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.refreshButton} ${isRefreshing ? styles.loading : ''}`}
              onClick={refreshTables}
              disabled={isRefreshing}
            >
              Posodobi
            </button>
            <button className={styles.newTableButton} onClick={createNewTable}>
              +
            </button>
            <div className={styles.toggleContainer}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                />
                <span className={styles.toggleSlider}></span>
              </label>
              <span className={styles.toggleLabel}>Hide Completed</span>
            </div>
          </div>
          <div className={styles.dateInputContainer}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
              className={styles.dateInput}
            />
            <span className={styles.dateArrow}>=&gt;</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
              className={styles.dateInput}
            />
          </div>
        </div>

        <div className={styles.tablesContainer}>
          {getFilteredTables().length === 0 ? (
            <p>No tables found for the selected date range.</p>
          ) : (
            <div className={styles.tablesGrid}>
              {getFilteredTables().map(table => (
                <div key={table.date} className={styles.table} data-date={table.date}>
                  <div className={`${styles.dateHeader} ${isTableCompleted(table) ? styles.completedDate : ''}`}>
                    <div className={styles.dateHeaderContent}>
                      <span>{table.date}</span>
                      {isTableCompleted(table) && <span className={styles.completedDateBadge}>Končano</span>}
                    </div>
                  </div>
                  {table.tasks.map((task, index) => (
                    <div key={task.id} className={index < table.tasks.length - 1 ? styles.taskContainer : styles.buttonRow}>
                      {index < table.tasks.length - 1 ? (
                        <>
                          <div className={styles.checkboxContainer}>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTaskComplete(table.date, task.id)}
                              className={styles.checkbox}
                            />
                          </div>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              value={task.content}
                              onChange={(e) => {
                                updateTask(table.date, task.id, e.target.value);
                                if (e.target) {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }
                              }}
                              maxLength={250}
                              className={task.completed ? styles.completedTask : styles.taskInput}
                              rows={1}
                            />
                            <span className={styles.charCounter}>
                              {task.content.length}/250
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.checkboxContainer}></div>
                          <div className={styles.buttonContainer}>
                            <button
                              className={styles.addButton}
                              onClick={() => addRow(table.date)}
                            >
                              Nova vrstica
                            </button>
                            <button
                              className={styles.saveButton}
                              onClick={() => saveTable(table)}
                            >
                              Shrani
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
       <p>&copy; {new Date().getFullYear()} Domen Unuk ==&gt; ko me vidiš daš za rundo</p>
      </footer>   
    </>
  );
}
