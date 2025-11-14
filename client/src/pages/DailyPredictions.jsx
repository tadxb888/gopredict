import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { dataAPI } from '../services/api';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function DailyPredictions() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);

  const columnDefs = [
    { field: 'predicted_date', headerName: 'predicted date', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 100 },
    { field: 'target_time', headerName: 'target_time', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 90 },
    { field: 'Symbol', headerName: 'Symbol', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'Description', headerName: 'Description', sortable: true, filter: 'agTextColumnFilter', flex: 1.5, minWidth: 100 },
    { field: 'predicted_high', headerName: 'predicted_high', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 90 },
    { field: 'predicted_trend', headerName: 'predicted_trend', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 90 },
    { field: 'predicted_low', headerName: 'predicted_low', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 90 },
    { field: 'predicted_strength', headerName: 'predicted_strength', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 100 },
    { field: 'predicted_range', headerName: 'predicted_range', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 100 },
    { field: 'predicted_trading_range', headerName: 'predicted_trading_range', sortable: true, filter: 'agNumberColumnFilter', flex: 1.2, minWidth: 120 },
    { field: 'momentum', headerName: 'momentum', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 80 },
    { field: 'days_since_reversal', headerName: 'days_since_reversal', sortable: true, filter: 'agNumberColumnFilter', flex: 1.2, minWidth: 110 },
    { field: 'opportunity', headerName: 'opportunity', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'conviction', headerName: 'conviction', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 80 },
    { field: 'trend_direction', headerName: 'trend_direction', sortable: true, filter: 'agTextColumnFilter', flex: 1, minWidth: 90 }
  ];

  const fetchData = async () => {
    try {
      const response = await dataAPI.getDailyPredictions();
      setRowData(response.data.data || []);
      setLoading(false);
      
      if (response.data.notifications?.length > 0) {
        toast.success(`${response.data.notifications.length} new alerts!`);
      }
    } catch (error) {
      console.error('Failed to fetch daily predictions:', error);
      toast.error('Failed to load predictions');
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
      width: '100%', 
      height: 'calc(100vh - 110px)',
      padding: '16px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ color: '#68FF8E', fontSize: '1.25rem' }}>Loading predictions...</div>
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
