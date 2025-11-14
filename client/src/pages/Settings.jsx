import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'trader'
  });

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const usersWithFullName = response.data.users.map(user => ({
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'
      }));
      setUsers(usersWithFullName);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load users');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const StatusCellRenderer = (params) => {
    const isActive = params.value === 'active';
    return (
      <span style={{ 
        padding: '4px 8px', 
        borderRadius: '4px', 
        fontSize: '0.75rem',
        backgroundColor: isActive ? '#14532d' : '#7f1d1d',
        color: isActive ? '#bbf7d0' : '#fca5a5'
      }}>
        {params.value}
      </span>
    );
  };

  const ActionsCellRenderer = (params) => {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => handleEdit(params.data)}
          style={{ color: '#00A2FF', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          Edit
        </button>
        <button
          onClick={() => handleSuspend(params.data.id, params.data.status)}
          style={{ color: '#eab308', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          {params.data.status === 'active' ? 'Suspend' : 'Activate'}
        </button>
        <button
          onClick={() => handleDelete(params.data.id)}
          style={{ color: '#ef4444', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          Delete
        </button>
      </div>
    );
  };

  const columnDefs = [
    { field: 'email', headerName: 'Email', sortable: true, filter: 'agTextColumnFilter', flex: 2, minWidth: 180 },
    { field: 'fullName', headerName: 'Name', sortable: true, filter: 'agTextColumnFilter', flex: 1.5, minWidth: 120 },
    { field: 'role', headerName: 'Role', sortable: true, filter: 'agSetColumnFilter', flex: 1, minWidth: 80 },
    { field: 'status', headerName: 'Status', sortable: true, filter: 'agSetColumnFilter', cellRenderer: StatusCellRenderer, flex: 1, minWidth: 90 },
    { headerName: 'Actions', cellRenderer: ActionsCellRenderer, flex: 1.5, minWidth: 160, sortable: false, filter: false }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, formData);
        toast.success('User updated successfully');
      } else {
        await userAPI.createUser(formData);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', firstName: '', lastName: '', role: 'trader' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userAPI.deleteUser(id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleSuspend = async (id, currentStatus) => {
    try {
      await userAPI.updateUser(id, { status: currentStatus === 'active' ? 'suspended' : 'active' });
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const users = results.data.filter(row => row.email);
          try {
            const response = await userAPI.bulkCreateUsers(users);
            toast.success(`Created ${response.data.results.created.length} users`);
            fetchUsers();
          } catch (error) {
            toast.error('Bulk upload failed');
          }
        }
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const users = XLSX.utils.sheet_to_json(firstSheet);
        
        try {
          const response = await userAPI.bulkCreateUsers(users);
          toast.success(`Created ${response.data.results.created.length} users`);
          fetchUsers();
        } catch (error) {
          toast.error('Bulk upload failed');
        }
      };
      reader.readAsArrayBuffer(file);
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
        padding: '24px', 
        borderBottom: '1px solid #429356',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#68FF8E', margin: 0 }}>User Management</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <label style={{ 
              padding: '8px 16px', 
              backgroundColor: '#2a2b36', 
              border: '1px solid #429356', 
              color: '#68FF8E',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Bulk Import (CSV/Excel)
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({ email: '', firstName: '', lastName: '', role: 'trader' });
                setShowModal(true);
              }}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#68FF8E', 
                color: '#21222C',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Add User
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ color: '#68FF8E', fontSize: '1.25rem' }}>Loading users...</div>
          </div>
        ) : (
          <div className="ag-theme-alpine-dark" style={{ height: '100%', width: '100%' }}>
            <AgGridReact
              rowData={users}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true
              }}
              pagination={true}
              paginationPageSize={20}
            />
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{ 
            backgroundColor: '#21222C', 
            border: '1px solid #429356', 
            borderRadius: '8px', 
            padding: '24px', 
            maxWidth: '28rem', 
            width: '100%' 
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#68FF8E', marginBottom: '16px' }}>
              {editingUser ? 'Edit User' : 'Add User'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#68FF8E', marginBottom: '8px' }}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    backgroundColor: '#2a2b36', 
                    border: '1px solid #429356', 
                    color: '#68FF8E',
                    borderRadius: '4px'
                  }}
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#68FF8E', marginBottom: '8px' }}>First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    backgroundColor: '#2a2b36', 
                    border: '1px solid #429356', 
                    color: '#68FF8E',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#68FF8E', marginBottom: '8px' }}>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    backgroundColor: '#2a2b36', 
                    border: '1px solid #429356', 
                    color: '#68FF8E',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#68FF8E', marginBottom: '8px' }}>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    backgroundColor: '#2a2b36', 
                    border: '1px solid #429356', 
                    color: '#68FF8E',
                    borderRadius: '4px'
                  }}
                  required
                >
                  <option value="trader">Trader</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="submit" 
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    backgroundColor: '#68FF8E', 
                    color: '#21222C',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    backgroundColor: '#2a2b36', 
                    border: '1px solid #429356', 
                    color: '#68FF8E',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
