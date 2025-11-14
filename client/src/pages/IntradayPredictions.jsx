import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { dataAPI } from '../services/api';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function IntradayPredictions() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('');

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
    { field: 'momentum', headerName: 'momentum', sortable: true, filter: 'agNumberColumnFilter', flex: 1, minWidth: 80 }
  ];

  const fetchData = async () => {
    try {
      const response = await dataAPI.getIntradayPredictions();
      setRowData(response.data.data || []);
      setLoading(false);
      
      if (response.data.notifications?.length > 0) {
        toast.success(`${response.data.notifications.length} new alerts!`);
      }
    } catch (error) {
      console.error('Failed to fetch intraday predictions:', error);
      toast.error('Failed to load predictions');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 900000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = rowData.filter(row => {
    const matchesSymbol = !symbolFilter || 
      row.Symbol?.toLowerCase().includes(symbolFilter.toLowerCase());
    const matchesTimeframe = timeframe === 'all' || row.target_time === timeframe;
    return matchesSymbol && matchesTimeframe;
  });

  const handleSymbolSearch = (e) => {
    if (e.key === 'Enter') {
      setSymbolFilter(e.target.value);
    }
  };

  return (
    <div style={{ 
      height: 'calc(100vh - 110px)', 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #429356',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#21222C', 
              border: '1px solid #429356', 
              color: '#68FF8E',
              borderRadius: '4px'
            }}
          >
            <option value="all">Select timeframe...</option>
            <option value="09:30">09:30</option>
            <option value="10:00">10:00</option>
            <option value="10:30">10:30</option>
            <option value="11:00">11:00</option>
            <option value="13:00">13:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
          </select>

          <input
            type="text"
            placeholder="type symbol and press enter..."
            onKeyPress={handleSymbolSearch}
            style={{ 
              flex: 1, 
              padding: '8px 16px', 
              backgroundColor: '#21222C', 
              border: '1px solid #429356', 
              color: '#68FF8E',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ color: '#68FF8E', fontSize: '1.25rem' }}>Loading predictions...</div>
          </div>
        ) : (
          <div className="ag-theme-alpine-dark" style={{ height: '100%', width: '100%' }}>
            <AgGridReact
              rowData={filteredData}
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
    </div>
  );
}
