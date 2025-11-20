import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import nexdayApi from '../services/nexdayApi';
import { transformIntradayPredictions } from '../utils/dataTransformers';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../components/Grid/gridStyles.css';

export default function IntradayPredictions() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('15min');
  const [lastUpdate, setLastUpdate] = useState(null);

  const columnDefs = [
    { 
      field: 'target_time', 
      headerName: 'target_time', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 180,
      pinned: 'left',
      valueFormatter: params => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleString();
      }
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
      field: 'predicted_low', 
      headerName: 'predicted_low', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 140,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_close', 
      headerName: 'predicted_close', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 150,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_trend', 
      headerName: 'predicted_trend', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 150,
      valueFormatter: params => params.value?.toFixed(2),
      cellStyle: params => {
        if (params.value > 0.5) return { color: '#50F178' };
        if (params.value < -0.5) return { color: '#FF5555' };
        return { color: '#F1FA8C' };
      }
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
      field: 'predicted_midpoint', 
      headerName: 'midpoint', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      width: 130,
      valueFormatter: params => params.value?.toFixed(2)
    },
    { 
      field: 'predicted_trading_range', 
      headerName: 'trading_range', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 160 
    },
    { 
      field: 'momentum', 
      headerName: 'momentum', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 130 
    },
    { 
      field: 'predicted_high_touched', 
      headerName: 'high_touched', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 140,
      valueFormatter: params => params.value ? 'Yes' : 'No',
      cellStyle: params => params.value ? { color: '#50F178' } : {}
    },
    { 
      field: 'predicted_low_touched', 
      headerName: 'low_touched', 
      sortable: true, 
      filter: 'agTextColumnFilter', 
      width: 140,
      valueFormatter: params => params.value ? 'Yes' : 'No',
      cellStyle: params => params.value ? { color: '#50F178' } : {}
    }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await nexdayApi.getIntradayPredictions(timeframe);
      const transformed = transformIntradayPredictions(response);
      
      setRowData(transformed);
      setLastUpdate(new Date());
      
      console.log(`Intraday predictions (${timeframe}) loaded:`, transformed.length, 'records');
      
    } catch (error) {
      console.error('Error fetching intraday predictions:', error);
      toast.error('Failed to load intraday predictions');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    
    // Polling logic
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

  const timeframes = ['15min', '30min', '1hour', '2hour'];

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#68FF8E', margin: 0, marginBottom: '5px' }}>Intraday Predictions</h1>
          {lastUpdate && (
            <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
              Last updated: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Timeframe selector */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '8px 16px',
                  background: timeframe === tf ? '#50F178' : '#429356',
                  color: timeframe === tf ? '#21222C' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: timeframe === tf ? 'bold' : 'normal'
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '8px 16px',
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
