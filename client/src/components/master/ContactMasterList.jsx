import { useState, useEffect } from 'react';
import { Home, Trash2, RotateCcw } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

// Removed mock data - now using backend API

export default function ContactMasterList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'confirmed', or 'archived'
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load contacts when tab changes
  useEffect(() => {
    loadContacts();
  }, [activeTab]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      // For "new" tab, show both new and confirmed statuses (all non-archived)
      // For "archived" tab, show only archived status
      const statusParam = activeTab === 'new' ? '' : `?status=${activeTab}`;
      const response = await fetch(`${API_ENDPOINTS.CONTACTS.BASE}${statusParam}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        // Filter out archived items when on "new" tab
        const filteredContacts = activeTab === 'new' 
          ? (data.data.contacts || []).filter(c => c.status !== 'archived')
          : (data.data.contacts || []);
        setContacts(filteredContacts);
      } else {
        toast.error(data.message || 'Failed to load contacts');
      }
    } catch (error) {
      console.error('Load contacts error:', error);
      toast.error('Failed to load contacts');
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
    if (selectedRows.size === contacts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(contacts.map((c) => c._id)));
    }
  };

  const handleToggleArchive = async (e, contact) => {
    e.stopPropagation();
    const isArchived = contact.status === 'archived';
    const action = isArchived ? 'restore' : 'archive';

    const toastId = toast.loading(`${action === 'archive' ? 'Archiving' : 'Restoring'} ${contact.name}...`);

    try {
      const response = await fetch(
        isArchived
          ? API_ENDPOINTS.CONTACTS.UNARCHIVE(contact._id)
          : API_ENDPOINTS.CONTACTS.BY_ID(contact._id),
        {
          method: isArchived ? 'POST' : 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success(`${contact.name} ${action}d successfully`, { id: toastId });
        loadContacts();
      } else {
        toast.error(data.message || `Failed to ${action} contact`, { id: toastId });
      }
    } catch (error) {
      console.error(`${action} contact error:`, error);
      toast.error(`Failed to ${action} contact`, { id: toastId });
    }
  };

  const handlePermanentDelete = async (e, contact) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ WARNING: This will permanently delete "${contact.name}" and cannot be undone. Are you absolutely sure?`)) {
      const toastId = toast.loading(`Permanently deleting ${contact.name}...`);

      try {
        const response = await fetch(API_ENDPOINTS.CONTACTS.PERMANENT_DELETE(contact._id), {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (data.success) {
          toast.success(`${contact.name} permanently deleted`, { id: toastId });
          loadContacts();
        } else {
          toast.error(data.message || 'Failed to delete contact', { id: toastId });
        }
      } catch (error) {
        console.error('Permanent delete contact error:', error);
        toast.error('Failed to delete contact', { id: toastId });
      }
    }
  };

  const handleDelete = async (e, contact) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive "${contact.name}"?`)) {
      try {
        const response = await fetch(API_ENDPOINTS.CONTACTS.BY_ID(contact._id), {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (data.success) {
          toast.success(`${contact.name} archived successfully`);
          loadContacts(); // Reload the list
        } else {
          toast.error(data.message || 'Failed to archive contact');
        }
      } catch (error) {
        console.error('Archive contact error:', error);
        toast.error('Failed to archive contact');
      }
    }
  };


  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Master</h1>
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
                      contacts.length > 0 &&
                      selectedRows.size === contacts.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-primary">Image</th>
                <th className="text-left p-4 font-semibold text-primary">Contact Name</th>
                <th className="text-left p-4 font-semibold text-primary">Email</th>
                <th className="text-left p-4 font-semibold text-primary">Phone</th>
                <th className="text-center p-4 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    No contacts found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact._id}
                    onClick={() => onEdit(contact._id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(contact._id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(contact._id)}
                        onChange={() => { }}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      {contact.image?.url ? (
                        <img
                          src={contact.image.url}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold border-2 border-border">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {contact.name}
                    </td>
                    <td className="p-4 text-muted-foreground">{contact.email}</td>
                    <td className="p-4 text-muted-foreground">{contact.phone || '-'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* Archive Toggle Switch */}
                        <label
                          className="relative inline-flex items-center cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={contact.status === 'archived'}
                            onChange={(e) => handleToggleArchive(e, contact)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning">
                          </div>
                          <span className="ml-3 text-sm text-gray-400 text-foreground">{contact.status === 'archived' ? 'Archived' : 'Active'}</span>
                        </label>

                        {/* Delete Button */}
                        {contact.status === 'archived' ? (
                          /* Permanent Delete for archived items */
                          <button
                            onClick={(e) => handlePermanentDelete(e, contact)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                            title="Permanently delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          /* Archive (soft delete) for new items */
                          <button
                            onClick={(e) => handleDelete(e, contact)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                            title="Archive contact"
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
