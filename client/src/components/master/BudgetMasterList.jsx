import { useState, useRef, useEffect } from 'react';
import { CircleDot } from 'lucide-react';
import { Button, Card } from '../ui';

// Mock data with pie chart values
const mockBudgets = [
  {
    id: 1,
    name: 'January 2026',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'Confirmed',
    achieved: 37950,
    balance: 642050,
    archived: false,
  },
  {
    id: 2,
    name: 'January 2026 (Rev 15 01 2026)',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'Confirmed',
    isRevised: true,
    achieved: 37950,
    balance: 642050,
    archived: false,
  },
];

export default function BudgetMasterList({ onNew, onEdit, onHome }) {
  const [activePieChart, setActivePieChart] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const pieChartRef = useRef(null);

  const displayedBudgets = mockBudgets.filter((budget) =>
    activeTab === 'new' ? !budget.archived : budget.archived
  );

  // Close pie chart when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pieChartRef.current && !pieChartRef.current.contains(event.target)) {
        setActivePieChart(null);
      }
    };

    if (activePieChart) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activePieChart]);

  const handlePieClick = (e, budget) => {
    e.stopPropagation();
    setActivePieChart(activePieChart === budget.id ? null : budget.id);
  };

  const getPieChartData = (budget) => {
    const total = budget.achieved + budget.balance;
    const achievedPercent = (budget.achieved / total) * 100;
    const balancePercent = (budget.balance / total) * 100;
    return { achievedPercent, balancePercent };
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
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left p-4 font-semibold text-primary text-sm">Budget Name</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">Start Date</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">End Date</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">Status</th>
                <th className="text-center p-4 font-semibold text-primary text-sm">Pie Chart</th>
              </tr>
            </thead>
            <tbody>
              {displayedBudgets.length === 0 ? (
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
                      key={budget.id}
                      className="border-b border-border group transition-all duration-300 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] hover:bg-muted/30"
                      style={{
                        cursor: 'pointer',
                      }}
                    >
                      <td
                        className="p-4 font-medium text-foreground group-hover:text-primary transition-colors duration-200"
                        onClick={() => onEdit(budget.id)}
                      >
                        {budget.name}
                        {budget.isRevised && (
                          <span className="ml-2 text-xs text-primary font-semibold">(Revised)</span>
                        )}
                      </td>
                      <td
                        className="p-4 text-muted-foreground text-sm"
                        onClick={() => onEdit(budget.id)}
                      >
                        {new Date(budget.startDate).toLocaleDateString()}
                      </td>
                      <td
                        className="p-4 text-muted-foreground text-sm"
                        onClick={() => onEdit(budget.id)}
                      >
                        {new Date(budget.endDate).toLocaleDateString()}
                      </td>
                      <td
                        className="p-4"
                        onClick={() => onEdit(budget.id)}
                      >
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                            budget.status === 'Confirmed'
                              ? 'bg-success/20 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {budget.status}
                        </span>
                      </td>
                      <td className="p-4 text-center relative">
                        <button
                          onClick={(e) => handlePieClick(e, budget)}
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-card border border-border transition-all duration-300 hover:shadow-[0_0_12px_rgba(132,204,22,0.3),0_2px_8px_rgba(0,0,0,0.1)] hover:scale-110 hover:-translate-y-0.5"
                          title="View pie chart"
                        >
                          <CircleDot size={18} className="text-primary" />
                        </button>

                        {/* Floating Pie Chart Panel */}
                        {activePieChart === budget.id && (
                          <div
                            ref={pieChartRef}
                            className="absolute right-0 top-12 z-50 animate-[fadeIn_0.3s_ease-out]"
                            style={{
                              animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1), scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            <Card className="p-6 w-64 neu-card shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                              <h3 className="text-sm font-semibold text-foreground mb-4">
                                Budget Distribution
                              </h3>
                              
                              {/* Simple Pie Chart Visualization */}
                              <div className="relative w-32 h-32 mx-auto mb-4">
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
                                    strokeDasharray={`${(achievedPercent * 251.2) / 100} 251.2`}
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
                                    strokeDasharray={`${(balancePercent * 251.2) / 100} 251.2`}
                                    strokeDashoffset={`-${(achievedPercent * 251.2) / 100}`}
                                    className="transition-all duration-500"
                                  />
                                </svg>
                              </div>

                              {/* Legend */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-success" />
                                    <span className="text-xs text-muted-foreground">Achieved</span>
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {budget.achieved.toLocaleString()}/-
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-accent" />
                                    <span className="text-xs text-muted-foreground">Balance</span>
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {budget.balance.toLocaleString()}/-
                                  </span>
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
