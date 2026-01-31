import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Eye } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import toast from 'react-hot-toast';

const mockBudget = {
  id: 1,
  name: 'January 2026',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  isRevised: false,
  revisedBudgetId: 2,
  lines: [
    {
      id: 1,
      analyticName: 'Deepawali',
      type: 'Income',
      budgetedAmount: 400000,
      achievedAmount: 21600,
      achievedPercent: null,
      amountToAchieve: 378400,
    },
    {
      id: 2,
      analyticName: 'Marriage Session 2026',
      type: 'Income',
      budgetedAmount: 'Monetary',
      achievedAmount: 'Compute',
      achievedPercent: null,
      amountToAchieve: null,
    },
    {
      id: 3,
      analyticName: 'Furniture Expo 2026',
      type: 'Income',
      budgetedAmount: 'Monetary',
      achievedAmount: 'Compute',
      achievedPercent: null,
      amountToAchieve: null,
    },
    {
      id: 4,
      analyticName: 'Deepawali',
      type: 'Expense',
      budgetedAmount: 280000,
      achievedAmount: 16350,
      achievedPercent: 5.84,
      amountToAchieve: null,
    },
    {
      id: 5,
      analyticName: 'Marriage Session 2026',
      type: 'Expense',
      budgetedAmount: 'Monetary',
      achievedAmount: 'Compute',
      achievedPercent: null,
      amountToAchieve: null,
    },
    {
      id: 6,
      analyticName: 'Furniture Expo 2026',
      type: 'Expense',
      budgetedAmount: 'Monetary',
      achievedAmount: 'Compute',
      achievedPercent: null,
      amountToAchieve: null,
    },
  ],
};

const mockRevisedBudget = {
  id: 2,
  name: 'January 2026 (Rev DD MM YYYY)',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  isRevised: true,
  originalBudgetId: 1,
  lines: mockBudget.lines,
};

export default function BudgetMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    lines: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('draft');
  const [isRevised, setIsRevised] = useState(false);
  const [linkedBudgetId, setLinkedBudgetId] = useState(null);

  useEffect(() => {
    if (recordId) {
      const budget = recordId === 2 ? mockRevisedBudget : mockBudget;
      setFormData({
        name: budget.name,
        startDate: budget.startDate,
        endDate: budget.endDate,
        lines: budget.lines,
      });
      setStatus('confirmed');
      setIsRevised(budget.isRevised);
      setLinkedBudgetId(budget.isRevised ? budget.originalBudgetId : budget.revisedBudgetId);
    }
  }, [recordId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('confirmed');
      toast.success(`Budget ${recordId ? 'updated' : 'created'} successfully!`);
      onBack();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevise = () => {
    toast.success('Creating revised budget...');
    // UI only - would navigate to new revised budget form
  };

  const handleArchive = () => {
    toast.success('Budget archived');
    onBack();
  };

  const handleCancel = () => {
    setStatus('cancelled');
    toast.success('Budget cancelled');
  };

  const isReadOnly = status === 'confirmed' || status === 'revised';
  const isDisabled = status === 'archived' || status === 'cancelled';

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Budget</h1>
          <p className="text-muted-foreground">
            {isRevised ? 'Form View of Revised Budget' : 'Form View of Original Budget'}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Action Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
          <Button onClick={onNew} variant="outline" size="sm" disabled={isDisabled}>
            New
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="sm"
            isLoading={isLoading}
            disabled={isLoading || isDisabled || isReadOnly}
          >
            {isLoading ? 'Saving...' : 'Confirm'}
          </Button>
          <Button
            onClick={handleRevise}
            variant="outline"
            size="sm"
            disabled={status !== 'confirmed' || isDisabled}
          >
            Revise
          </Button>
          <Button onClick={handleArchive} variant="outline" size="sm" disabled={isDisabled}>
            Archived
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status === 'draft' 
                ? 'bg-muted text-muted-foreground'
                : status === 'confirmed'
                ? 'bg-success/20 text-success'
                : status === 'revised'
                ? 'bg-primary/20 text-primary'
                : 'bg-destructive/20 text-destructive'
            }`}>
              {status === 'draft' ? 'Draft' : status === 'confirmed' ? 'Confirm' : status === 'revised' ? 'Revised' : 'Cancelled'}
            </span>
          </div>
          <Button onClick={onHome} variant="outline" size="sm">
            <Home size={16} />
          </Button>
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Budget Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter budget name"
                disabled={isReadOnly || isDisabled}
                required
              />
              {linkedBudgetId && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">
                    {isRevised ? 'Revision Of' : 'Revised with'}
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info(`Navigate to ${isRevised ? 'Original' : 'Revised'} Budget`)}
                    className="text-primary hover:underline text-sm"
                  >
                    {isRevised ? 'Original Budget' : 'Revised Budget'}
                    <span className="ml-2 text-xs">(clickable link)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Budget Period
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    disabled={isReadOnly || isDisabled}
                  />
                  <span className="text-muted-foreground">To</span>
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    disabled={isReadOnly || isDisabled}
                  />
                </div>
              </div>
            </div>

            {/* Budget Lines Table */}
            <div className="mt-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/20">
                      <th className="text-left p-3 font-semibold text-primary text-sm">Analytic Name</th>
                      <th className="text-left p-3 font-semibold text-primary text-sm">Type</th>
                      <th className="text-right p-3 font-semibold text-primary text-sm">Budgeted Amount</th>
                      <th className="text-right p-3 font-semibold text-primary text-sm">Achieved Amount</th>
                      <th className="text-right p-3 font-semibold text-primary text-sm">Achieved %</th>
                      <th className="text-right p-3 font-semibold text-primary text-sm">Amount to Achieve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line) => (
                      <tr
                        key={line.id}
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${
                          line.type === 'Income' ? 'bg-success/5' : 'bg-accent/5'
                        }`}
                      >
                        <td className="p-3 text-sm text-foreground">{line.analyticName}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            line.type === 'Income' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-accent/20 text-accent-foreground'
                          }`}>
                            {line.type}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-right">
                          {typeof line.budgetedAmount === 'number' 
                            ? `${line.budgetedAmount.toLocaleString()}/-` 
                            : <span className="text-destructive font-medium">{line.budgetedAmount}</span>
                          }
                        </td>
                        <td className="p-3 text-sm text-right">
                          {status === 'confirmed' ? (
                            <div className="flex items-center justify-end gap-2">
                              {typeof line.achievedAmount === 'number' 
                                ? `${line.achievedAmount.toLocaleString()}/-` 
                                : <span className="text-destructive font-medium">{line.achievedAmount}</span>
                              }
                              <button
                                type="button"
                                onClick={() => toast.info('View achievement details')}
                                className="p-1 rounded hover:bg-muted transition-colors"
                                title="View"
                              >
                                <Eye size={14} className="text-primary" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {status === 'confirmed' && line.achievedPercent ? (
                            <span className="font-medium">
                              {line.achievedPercent.toFixed(2)} %
                              {line.achievedPercent < 100 && (
                                <span className="ml-2 text-xs text-primary">(Budgeted Amount * 100)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {status === 'confirmed' && line.amountToAchieve ? (
                            `${line.amountToAchieve.toLocaleString()}/-`
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
