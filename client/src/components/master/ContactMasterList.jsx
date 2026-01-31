import { useState } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';

// Mock data - replace with actual API calls
const mockContacts = [
  {
    id: 1,
    name: 'Azure Interior',
    email: 'azure.Interior24@example.com',
    phone: '+91 8080808080',
    image: null,
    archived: false,
  },
  {
    id: 2,
    name: 'Nimesh Pathak',
    email: 'brandon.freeman55@example.com',
    phone: '+91 9090909090',
    image: 'https://i.pravatar.cc/150?img=12',
    archived: false,
  },
];

export default function ContactMasterList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'archived'
  const [selectedRows, setSelectedRows] = useState(new Set());

  const displayedContacts = mockContacts.filter((contact) =>
    activeTab === 'new' ? !contact.archived : contact.archived
  );

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
    if (selectedRows.size === displayedContacts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayedContacts.map((c) => c.id)));
    }
  };

  const handleDelete = (e, contact) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${contact.name}"?`)) {
      // Here you would call your API to delete the contact
      toast.success(`${contact.name} deleted successfully`);
      // TODO: Remove from list or refetch data
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
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'new'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'archived'
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
                      displayedContacts.length > 0 &&
                      selectedRows.size === displayedContacts.length
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
              {displayedContacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    No contacts found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                displayedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => onEdit(contact.id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(contact.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(contact.id)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      {contact.image ? (
                        <img
                          src={contact.image}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold border-2 border-border">
                          {contact.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {contact.name}
                    </td>
                    <td className="p-4 text-muted-foreground">{contact.email}</td>
                    <td className="p-4 text-muted-foreground">{contact.phone}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => handleDelete(e, contact)}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                        title="Delete contact"
                      >
                        <Trash2 size={16} />
                      </button>
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
