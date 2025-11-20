import { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import nexdayApi from '../services/nexdayApi';
import { transformTradebook } from '../utils/dataTransformers';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../components/Grid/gridStyles.css';

export default function Tradebook() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const gridRef = useRef(null);

  const columnDefs = [
    { field: 'target_date', headerName: 'target_date', sortable: true, filter: 'agTextColumnFilter' },
    { field: 'symbol', headerName: 'Symbol', sortable: true, filter: 'agTextColumnFilter' },
    { field: 'Description', headerName: 'Description', sortable: true, filter: 'agTextColumnFilter' },
    { field: 'action', headerName: 'action', sortable: true, filter: 'agTextColumnFilter', cellStyle: params => { if (params.value === 'Long') return { color: '#50F178', fontWeight: 'bold' }; if (params.value === 'Short') return { color: '#FF5555', fontWeight: 'bold' }; return {}; } },
    { field: 'entry_min', headerName: 'entry_min', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2), cellStyle: { color: '#00A2FF' } },
    { field: 'entry_max', headerName: 'entry_max', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2), cellStyle: { color: '#00A2FF' } },
    { field: 'tp_min', headerName: 'tp_min', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2), cellStyle: { color: '#50F178' } },
    { field: 'tp_max', headerName: 'tp_max', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2), cellStyle: { color: '#50F178' } },
    { field: 'sl_min', headerName: 'sl_min', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2), cellStyle: { color: '#FF5555' } },
    { field: 'sl_max', headerName: 'sl_max', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2), cellStyle: { color: '#FF5555' } },
    { field: 'predicted_midpoint', headerName: 'midpoint', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'predicted_onefourth', headerName: '1/4_point', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'predicted_threefourth', headerName: '3/4_point', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'predicted_range', headerName: 'range', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'predicted_trading_range', headerName: 'trading_range', sortable: true, filter: 'agTextColumnFilter' },
    { field: 'predicted_high', headerName: 'predicted_high', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'predicted_low', headerName: 'predicted_low', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'predicted_strength', headerName: 'strength', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => params.value?.toFixed(2) },
    { field: 'days_since_reversal', headerName: 'days_since_reversal', sortable: true, filter: 'agNumberColumnFilter' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await nexdayApi.getTradebook();
      const transformed = transformTradebook(response);
      setRowData(transformed);
      setLastUpdate(new Date());
      console.log('Tradebook loaded:', transformed.length, 'records');
    } catch (error) {
      console.error('Error fetching tradebook:', error);
      toast.error('Failed to load tradebook');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const getNextPollDelay = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const pollMinutes = [1, 16, 31, 46];
      let nextPollMinute = pollMinutes.find(m => m > currentMinute);
      if (!nextPollMinute) nextPollMinute = pollMinutes[0];
      const nextPollTime = new Date(now);
      if (nextPollMinute <= currentMinute) nextPollTime.setHours(nextPollTime.getHours() + 1);
      nextPollTime.setMinutes(nextPollMinute, 0, 0);
      return nextPollTime.getTime() - now.getTime();
    };
    const scheduleNextPoll = () => {
      const delay = getNextPollDelay();
      setTimeout(() => { fetchData(); scheduleNextPoll(); }, delay);
    };
    scheduleNextPoll();
  }, [fetchData]);

  const onGridReady = (params) => {
    params.api.sizeColumnsToFit();
  };

  const defaultColDef = { resizable: true, sortable: true, filter: true };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div>
          <h1 style={{ color: '#68FF8E', margin: 0, marginBottom: '5px' }}>Tradebook</h1>
          {lastUpdate && <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Last updated: {lastUpdate.toLocaleString()}</p>}
        </div>
        <button onClick={fetchData} disabled={loading} style={{ padding: '10px 20px', background: '#429356', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <div className="ag-theme-gopredict" style={{ height: 'calc(100% - 60px)', width: '100%' }}>
        <AgGridReact ref={gridRef} rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} onGridReady={onGridReady} animateRows={true} rowSelection="multiple" pagination={true} paginationPageSize={50} paginationPageSizeSelector={[25, 50, 100, 200]} loading={loading} />
      </div>
    </div>
  );
}
