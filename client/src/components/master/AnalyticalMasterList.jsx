import { useState } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';

// Mock data
const mockAnalyticals = [
  {
    id: 1,
    name: 'Marketing Campaign 2026',
    code: 'MKT-2026',
    type: 'Marketing',
    archived: false,
  },
  {
    id: 2,
    name: 'R&D Project Alpha',
    code: 'RND-ALPHA',
    type: 'Research',
    archived: false,
  },
];

export default function AnalyticalMasterList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedRows, setSelectedRows] = useState(new Set());

  const displayedAnalyticals = mockAnalyticals.filter((item) =>
    activeTab === 'new' ? !item.archived : item.archived
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
    if (selectedRows.size === displayedAnalyticals.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayedAnalyticals.map((a) => a.id)));
    }
  };

  const handleDelete = (e, item) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      // Here you would call your API to delete the analytical account
      toast.success(`${item.name} deleted successfully`);
      // TODO: Remove from list or refetch data
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytical Master</h1>
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
                      displayedAnalyticals.length > 0 &&
                      selectedRows.size === displayedAnalyticals.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-primary">Name</th>
                <th className="text-left p-4 font-semibold text-primary">Code</th>
                <th className="text-left p-4 font-semibold text-primary">Type</th>
                <th className="text-center p-4 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAnalyticals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-12 text-muted-foreground">
                    No analytical accounts found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                displayedAnalyticals.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onEdit(item.id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(item.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(item.id)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </td>
                    <td className="p-4 text-muted-foreground">{item.code}</td>
                    <td className="p-4 text-muted-foreground">{item.type}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => handleDelete(e, item)}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                        title="Delete analytical account"
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
