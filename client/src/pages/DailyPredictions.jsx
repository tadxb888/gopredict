import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import nexdayApi from '../services/nexdayApi';
import { transformDailyPredictions } from '../utils/dataTransformers';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../components/Grid/gridStyles.css';

export default function DailyPredictions() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const columnDefs = [
    { 
      field: 'predicted_date', 
      headerName: 'predicted date', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 130,
      pinned: 'left'
    },
    { 
      field: 'symbol', 
      headerName: 'Symbol', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 100,
      pinned: 'left'
    },
    { 
      field: 'Description', 
      headerName: 'Description', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 200 
    },
    { 
      field: 'predicted_high', 
      headerName: 'predicted_high', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 140,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_trend', 
      headerName: 'predicted_trend', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 140,
      cellStyle: params => {
        if (params.value === 'Bullish') return { color: '#50F178' };
        if (params.value === 'Bearish') return { color: '#FF5555' };
        return { color: '#F1FA8C' };
      }
    },
    { 
      field: 'predicted_low', 
      headerName: 'predicted_low', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 140,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_strength', 
      headerName: 'predicted_strength', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 160,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_range', 
      headerName: 'predicted_range', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 150,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_trading_range', 
      headerName: 'predicted_trading_range', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 200 
    },
    { 
      field: 'momentum', 
      headerName: 'momentum', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 130 
    },
    { 
      field: 'days_since_reversal', 
      headerName: 'days_since_reversal', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 170 
    },
    { 
      field: 'opportunity', 
      headerName: 'opportunity', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 130,
      cellStyle: params => {
        if (params.value === 'LONG') return { color: '#50F178', fontWeight: 'bold' };
        if (params.value === 'SHORT') return { color: '#FF5555', fontWeight: 'bold' };
        return {};
      }
    },
    { 
      field: 'conviction', 
      headerName: 'conviction', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 120,
      cellStyle: params => {
        if (params.value === 'High') return { color: '#50F178', fontWeight: 'bold' };
        if (params.value === 'Medium') return { color: '#F1FA8C' };
        if (params.value === 'Low') return { color: '#FF9580' };
        return {};
      }
    },
    { 
      field: 'trend_direction', 
      headerName: 'trend_direction', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 150 
    }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both endpoints in parallel
      const [predictions, opportunities] = await Promise.all([
        nexdayApi.getDailyPredictions(),
        nexdayApi.getOpportunities()
      ]);
      
      // Transform and merge data
      const transformed = transformDailyPredictions(predictions, opportunities);
      setRowData(transformed);
      setLastUpdate(new Date());
      
      console.log('Daily predictions loaded:', transformed.length, 'records');
      
    } catch (error) {
      console.error('Error fetching daily predictions:', error);
      toast.error('Failed to load daily predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Polling at :01, :16, :31, :46
    const getNextPollDelay = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const pollMinutes = [1, 16, 31, 46];
      
      let nextPollMinute = pollMinutes.find(m => m > currentMinute);
      if (!nextPollMinute) {
        nextPollMinute = pollMinutes[0];
      }
      
      const nextPollTime = new Date(now);
      if (nextPollMinute <= currentMinute) {
        nextPollTime.setHours(nextPollTime.getHours() + 1);
      }
      nextPollTime.setMinutes(nextPollMinute, 0, 0);
      
      return nextPollTime.getTime() - now.getTime();
    };
    
    const scheduleNextPoll = () => {
      const delay = getNextPollDelay();
      setTimeout(() => {
        fetchData();
        scheduleNextPoll();
      }, delay);
    };
    
    scheduleNextPoll();
  }, [fetchData]);

  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div>
          <h1 style={{ color: '#68FF8E', margin: 0, marginBottom: '5px' }}>Daily Predictions</h1>
          {lastUpdate && (
            <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
              Last updated: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#429356',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="ag-theme-gopredict" style={{ height: 'calc(100% - 60px)', width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          loading={loading}
        />
      </div>
    </div>
  );
}
