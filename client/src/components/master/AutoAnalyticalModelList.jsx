import { useState } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';

const mockModels = [
  {
    id: 1,
    partnerTag: 'VIP Customer',
    partner: 'Mr. A',
    productCategory: 'Wooden Furniture',
    product: 'Office Chair',
    analyticToApply: 'Deepawali',
    status: 'Confirmed',
    archived: false,
  },
];

export default function AutoAnalyticalModelList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedRows, setSelectedRows] = useState(new Set());

  const displayedModels = mockModels.filter((model) =>
    activeTab === 'new' ? !model.archived : model.archived
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
    if (selectedRows.size === displayedModels.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayedModels.map((m) => m.id)));
    }
  };

  const handleDelete = (e, model) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete this model?`)) {
      toast.success('Model deleted successfully');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Auto Analytical Model</h1>
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

      <Card className="overflow-hidden">
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-4 font-semibold text-primary">
                  <input
                    type="checkbox"
                    checked={
                      displayedModels.length > 0 &&
                      selectedRows.size === displayedModels.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-primary">Partner Tag</th>
                <th className="text-left p-4 font-semibold text-primary">Partner</th>
                <th className="text-left p-4 font-semibold text-primary">Product Category</th>
                <th className="text-left p-4 font-semibold text-primary">Product</th>
                <th className="text-left p-4 font-semibold text-primary">Analytic</th>
                <th className="text-left p-4 font-semibold text-primary">Status</th>
                <th className="text-center p-4 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedModels.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-12 text-muted-foreground">
                    No models found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                displayedModels.map((model) => (
                  <tr
                    key={model.id}
                    onClick={() => onEdit(model.id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(model.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(model.id)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-muted-foreground">{model.partnerTag || '-'}</td>
                    <td className="p-4 text-muted-foreground">{model.partner || '-'}</td>
                    <td className="p-4 text-muted-foreground">{model.productCategory || '-'}</td>
                    <td className="p-4 text-muted-foreground">{model.product || '-'}</td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {model.analyticToApply}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        model.status === 'Confirmed' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {model.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => handleDelete(e, model)}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                        title="Delete model"
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
