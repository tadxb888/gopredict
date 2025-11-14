import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { dataAPI } from '../services/api';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function Tradebook() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);

  const columnDefs = [
    { field: 'predicted_date', headerName: 'predicted date', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 100 },
    { field: 'target_time', headerName: 'target_time', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 90 },
    { field: 'Symbol', headerName: 'Symbol', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'Description', headerName: 'Description', sortable: true, filter: 'agTextColumnFilter', flex: 1.5, minWidth: 100 },
    { field: 'action', headerName: 'action', sortable: true, filter: 'agTextColumnFilter', flex: 0.8, minWidth: 70 },
    { field: 'entry_min', headerName: 'entry_min', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 80 },
    { field: 'entry_max', headerName: 'entry_max', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 80 },
    { field: 'tp_min', headerName: 'tp_min', sortable: true, filter: 'agNumberColumnFilter', flex: 0.8, minWidth: 70 },
    { field: 'tp_max', headerName: 'tp_max', sortable: true, filter: 'agNumberColumnFilter', flex: 0.8, minWidth: 70 },
    { field: 'sl_min', headerName: 'sl_min', sortable: true, filter: 'agNumberColumnFilter', flex: 0.8, minWidth: 70 },
    { field: 'sl_max', headerName: 'sl_max', sortable: true, filter: 'agNumberColumnFilter', flex: 0.8, minWidth: 70 },
    { field: 'opportunity', headerName: 'opportunity', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'conviction', headerName: 'conviction', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'macd_signal', headerName: 'macd_signal', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'trend_direction', headerName: 'trend_direction', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 90 }
  ];

  const fetchData = async () => {
    try {
      const response = await dataAPI.getTradebook();
      setRowData(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch tradebook:', error);
      toast.error('Failed to load tradebook');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 900000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      height: 'calc(100vh - 110px)', 
      width: '100%', 
      padding: '16px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ color: '#68FF8E', fontSize: '1.25rem' }}>Loading tradebook...</div>
        </div>
      ) : (
        <div className="ag-theme-alpine-dark" style={{ height: '100%', width: '100%' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true
            }}
            pagination={true}
            paginationPageSize={50}
          />
        </div>
      )}
    </div>
  );
}
