import { useState } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';

const mockBudgets = [
  {
    id: 1,
    name: 'January 2026',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'Confirmed',
    isRevised: false,
    revisedBudgetId: 2,
    archived: false,
  },
  {
    id: 2,
    name: 'January 2026 (Rev 15 01 2026)',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'Confirmed',
    isRevised: true,
    originalBudgetId: 1,
    archived: false,
  },
];

export default function BudgetMasterList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedRows, setSelectedRows] = useState(new Set());

  const displayedBudgets = mockBudgets.filter((budget) =>
    activeTab === 'new' ? !budget.archived : budget.archived
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
    if (selectedRows.size === displayedBudgets.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayedBudgets.map((b) => b.id)));
    }
  };

  const handleDelete = (e, budget) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${budget.name}"?`)) {
      toast.success(`${budget.name} deleted successfully`);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Budget</h1>
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
                      displayedBudgets.length > 0 &&
                      selectedRows.size === displayedBudgets.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-primary">Budget Name</th>
                <th className="text-left p-4 font-semibold text-primary">Start Date</th>
                <th className="text-left p-4 font-semibold text-primary">End Date</th>
                <th className="text-left p-4 font-semibold text-primary">Status</th>
                <th className="text-center p-4 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedBudgets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    No budgets found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                displayedBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => onEdit(budget.id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(budget.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(budget.id)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {budget.name}
                      {budget.isRevised && (
                        <span className="ml-2 text-xs text-primary">(Revised)</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(budget.startDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(budget.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        budget.status === 'Confirmed' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {budget.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => handleDelete(e, budget)}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                        title="Delete budget"
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
