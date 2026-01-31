import { useState, useEffect } from 'react';
import { CircleDot, X } from 'lucide-react';
import { Button, Card } from '../ui';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';
import toast from 'react-hot-toast';

export default function BudgetMasterList({ onNew, onEdit, onHome }) {
  const [selectedBudgetForPieChart, setSelectedBudgetForPieChart] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch budgets from database
  useEffect(() => {
    fetchBudgets();
  }, [activeTab]);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      // For "new" tab, fetch all non-archived budgets (draft, confirmed, revised)
      // For "archived" tab, fetch only archived budgets
      const statusParam = activeTab === 'new' ? 'all' : 'archived';
      const url = statusParam === 'all'
        ? `${API_ENDPOINTS.BUDGETS.BASE}?status=all`
        : `${API_ENDPOINTS.BUDGETS.BASE}?status=${statusParam}`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        let filteredBudgets = data.data.budgets || [];
        // Filter out archived budgets when showing "new" tab
        if (activeTab === 'new') {
          filteredBudgets = filteredBudgets.filter(b => b.status !== 'archived');
        }
        setBudgets(filteredBudgets);
      } else {
        toast.error(data.message || 'Failed to load budgets');
        setBudgets([]);
      }
    } catch (error) {
      console.error('Fetch budgets error:', error);
      toast.error('Failed to load budgets');
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedBudgets = budgets;

  const handlePieClick = (e, budget) => {
    e.stopPropagation();
    setSelectedBudgetForPieChart(budget);
  };

  const getPieChartData = (budget) => {
    // Calculate totals from budget lines
    const totalBudgeted = budget.lines?.reduce((sum, line) => sum + (line.budgetedAmount || 0), 0) || 0;
    const totalAchieved = budget.lines?.reduce((sum, line) => sum + (line.achievedAmount || 0), 0) || 0;
    const balance = totalBudgeted - totalAchieved;

    const total = totalBudgeted;
    const achievedPercent = total > 0 ? (totalAchieved / total) * 100 : 0;
    const balancePercent = total > 0 ? (balance / total) * 100 : 0;

    return {
      achievedPercent,
      balancePercent,
      achieved: totalAchieved,
      balance: balance
    };
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Budget</h1>
          <p className="text-sm text-muted-foreground">List View</p>
        </div>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden neu-card">
        {/* Tabs and New Button Bar */}
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
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left p-4 font-semibold text-primary text-sm">Budget Name</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">Start Date</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">End Date</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">Status</th>
                <th className="text-center p-4 font-semibold text-primary text-sm">Pie Chart</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center p-12 text-muted-foreground">
                    Loading budgets...
                  </td>
                </tr>
              ) : displayedBudgets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-12 text-muted-foreground">
                    No budgets found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                displayedBudgets.map((budget) => {
                  const { achievedPercent, balancePercent } = getPieChartData(budget);
                  return (
                    <tr
                      key={budget._id}
                      className="border-b border-border group transition-all duration-300 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] hover:bg-muted/30"
                      style={{
                        cursor: 'pointer',
                      }}
                    >
                      <td
                        className="p-4 font-medium text-foreground group-hover:text-primary transition-colors duration-200"
                        onClick={() => onEdit(budget._id)}
                      >
                        {budget.name}
                        {budget.isRevised && (
                          <span className="ml-2 text-xs text-primary font-semibold">(Revised)</span>
                        )}
                      </td>
                      <td
                        className="p-4 text-muted-foreground text-sm"
                        onClick={() => onEdit(budget._id)}
                      >
                        {new Date(budget.startDate).toLocaleDateString()}
                      </td>
                      <td
                        className="p-4 text-muted-foreground text-sm"
                        onClick={() => onEdit(budget._id)}
                      >
                        {new Date(budget.endDate).toLocaleDateString()}
                      </td>
                      <td
                        className="p-4"
                        onClick={() => onEdit(budget._id)}
                      >
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${budget.status?.toLowerCase() === 'confirmed'
                            ? 'bg-success/20 text-success'
                            : 'bg-muted text-muted-foreground'
                            }`}
                        >
                          {budget.status?.charAt(0).toUpperCase() + budget.status?.slice(1)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={(e) => handlePieClick(e, budget)}
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-card border border-border transition-all duration-300 hover:shadow-[0_0_12px_rgba(132,204,22,0.3),0_2px_8px_rgba(0,0,0,0.1)] hover:scale-110 hover:-translate-y-0.5"
                          title="View pie chart"
                        >
                          <CircleDot size={18} className="text-primary" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pie Chart Modal */}
      {selectedBudgetForPieChart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 mt-16 animate-fadeIn">
          <Card className="max-w-md w-full p-8 neu-card shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Budget Distribution</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedBudgetForPieChart.name}</p>
              </div>
              <button
                onClick={() => setSelectedBudgetForPieChart(null)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Close"
              >
                <X size={20} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Pie Chart Visualization */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="20"
                />
                {/* Achieved segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--success))"
                  strokeWidth="20"
                  strokeDasharray={`${(getPieChartData(selectedBudgetForPieChart).achievedPercent * 251.2) / 100} 251.2`}
                  className="transition-all duration-500"
                />
                {/* Balance segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="20"
                  strokeDasharray={`${(getPieChartData(selectedBudgetForPieChart).balancePercent * 251.2) / 100} 251.2`}
                  strokeDashoffset={`-${(getPieChartData(selectedBudgetForPieChart).achievedPercent * 251.2) / 100}`}
                  className="transition-all duration-500"
                />
              </svg>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {getPieChartData(selectedBudgetForPieChart).achievedPercent.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Achieved</p>
                </div>
              </div>
            </div>

            {/* Legend with detailed amounts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-success" />
                  <span className="text-sm font-medium text-foreground">Achieved</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {getPieChartData(selectedBudgetForPieChart).achieved.toLocaleString()}/-
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-foreground">Balance</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {getPieChartData(selectedBudgetForPieChart).balance.toLocaleString()}/-
                </span>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedBudgetForPieChart(null)} variant="outline">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
