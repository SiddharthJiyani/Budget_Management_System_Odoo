import { useState, useEffect } from 'react';
import { Home, Trash2, RotateCcw } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

// Removed mock data - now using backend API

export default function AnalyticalMasterList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [analytics, setAnalytics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load analytics when tab changes
  useEffect(() => {
    loadAnalytics();
  }, [activeTab]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // For "new" tab, show both new and confirmed statuses (all non-archived)
      // For "archived" tab, show only archived status
      const statusParam = activeTab === 'new' ? '' : `?status=${activeTab}`;
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS.BASE}${statusParam}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        // Filter out archived items when on "new" tab
        const filteredAnalytics = activeTab === 'new' 
          ? (data.data.analytics || []).filter(a => a.status !== 'archived')
          : (data.data.analytics || []);
        setAnalytics(filteredAnalytics);
      } else {
        toast.error(data.message || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Load analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === analytics.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(analytics.map((a) => a._id)));
    }
  };

  const handleToggleArchive = async (e, item) => {
    e.stopPropagation();
    const isArchived = item.status === 'archived';
    const action = isArchived ? 'restore' : 'archive';

    const toastId = toast.loading(`${action === 'archive' ? 'Archiving' : 'Restoring'} ${item.name}...`);

    try {
      const response = await fetch(
        isArchived
          ? API_ENDPOINTS.ANALYTICS.UNARCHIVE(item._id)
          : API_ENDPOINTS.ANALYTICS.BY_ID(item._id),
        {
          method: isArchived ? 'POST' : 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success(`${item.name} ${action}d successfully`, { id: toastId });
        loadAnalytics();
      } else {
        toast.error(data.message || `Failed to ${action} analytic`, { id: toastId });
      }
    } catch (error) {
      console.error(`${action} analytic error:`, error);
      toast.error(`Failed to ${action} analytic`, { id: toastId });
    }
  };

  const handlePermanentDelete = async (e, item) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ Permanently delete "${item.name}"? This cannot be undone!`)) {
      const toastId = toast.loading(`Permanently deleting ${item.name}...`);

      try {
        const response = await fetch(API_ENDPOINTS.ANALYTICS.PERMANENT_DELETE(item._id), {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`${item.name} permanently deleted`, { id: toastId });
          loadAnalytics();
        } else {
          toast.error(data.message || 'Failed to delete', { id: toastId });
        }
      } catch (error) {
        toast.error('Failed to delete analytic', { id: toastId });
      }
    }
  };


  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Master</h1>
          <p className="text-muted-foreground">List View</p>
        </div>
        <Button
          onClick={onHome}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home size={18} />
          Home
        </Button>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-3 font-semibold transition-all ${activeTab === 'new'
              ? 'bg-card text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
          >
            New
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-3 font-semibold transition-all ${activeTab === 'archived'
              ? 'bg-card text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
          >
            Archived
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-6">
            <Button onClick={onNew} variant="primary" size="sm">
              New
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-4 font-semibold text-primary">
                  <input
                    type="checkbox"
                    checked={
                      analytics.length > 0 &&
                      selectedRows.size === analytics.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-primary">Analytic Name</th>
                <th className="text-left p-4 font-semibold text-primary">Product Category</th>
                <th className="text-left p-4 font-semibold text-primary">Start Date</th>
                <th className="text-left p-4 font-semibold text-primary">End Date</th>
                <th className="text-left p-4 font-semibold text-primary">Status</th>
                <th className="text-center p-4 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-muted-foreground">
                    Loading analytics...
                  </td>
                </tr>
              ) : analytics.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-muted-foreground">
                    No analytics found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                analytics.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => onEdit(item._id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(item._id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(item._id)}
                        onChange={() => { }}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </td>
                    <td className="p-4 text-muted-foreground">{item.productCategory?.name || '-'}</td>
                    <td className="p-4 text-muted-foreground">
                      {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'confirmed'
                        ? 'bg-success/20 text-success'
                        : item.status === 'new'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <label
                          className="relative inline-flex items-center cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={item.status === 'archived'}
                            onChange={(e) => handleToggleArchive(e, item)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning">
                          </div>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.status === 'archived' ? 'Archived' : 'Active'}
                          </span>
                        </label>

                        {/* Delete Button */}
                        {item.status === 'archived' ? (
                          /* Permanent Delete for archived items */
                          <button
                            onClick={(e) => handlePermanentDelete(e, item)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                            title="Permanently delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          /* Archive (soft delete) for new items */
                          <button
                            onClick={(e) => handleToggleArchive(e, item)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                            title="Archive analytic"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
