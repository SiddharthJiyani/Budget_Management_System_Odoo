import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Button, Card } from '../ui';
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
  const [budget, setBudget] = useState(null);
  const [status, setStatus] = useState('draft');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (recordId) {
      const data = recordId === 2 ? mockRevisedBudget : mockBudget;
      setBudget(data);
      setStatus('confirmed');
    } else {
      setBudget({
        name: '',
        startDate: '',
        endDate: '',
        lines: [],
      });
      setStatus('draft');
    }
  }, [recordId]);

  const handleNew = () => {
    onNew();
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('confirmed');
      toast.success('Budget confirmed successfully!');
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevise = () => {
    toast.info('Creating revised budget...');
  };

  const handleArchive = () => {
    toast.info('Budget archived');
    onBack();
  };

  const handleRevisionLinkClick = () => {
    toast.info(`Navigate to ${budget?.isRevised ? 'Original' : 'Revised'} Budget`);
  };

  if (!budget) return null;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Budget</h1>
        <p className="text-sm text-muted-foreground">
          {budget.isRevised ? 'Form View of Revised Budget' : 'Form View of Original Budget'}
        </p>
      </div>

      <Card className="overflow-hidden neu-card">
        {/* Action Bar & Status Ribbon */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20">
          {/* Left: Action Buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={handleNew} variant="outline" size="sm">
              New
            </Button>
            <Button
              onClick={handleConfirm}
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={isLoading || status === 'confirmed'}
            >
              {isLoading ? 'Confirming...' : 'Confirm'}
            </Button>
            <Button
              onClick={handleRevise}
              variant="outline"
              size="sm"
              disabled={status !== 'confirmed'}
            >
              Revise
            </Button>
            <Button onClick={handleArchive} variant="outline" size="sm">
              Archived
            </Button>
          </div>

          {/* Right: Status Stepper */}
          <div className="flex items-center gap-1">
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${
                status === 'draft'
                  ? 'text-foreground'
                  : 'text-muted-foreground/60'
              }`}
            >
              Draft
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                status === 'confirmed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground/60'
              }`}
            >
              Confirm
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${
                status === 'revised'
                  ? 'text-primary'
                  : 'text-muted-foreground/60'
              }`}
            >
              Revised
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${
                status === 'cancelled'
                  ? 'text-destructive'
                  : 'text-muted-foreground/60'
              }`}
            >
              Cancelled
            </span>
          </div>
        </div>

        {/* Budget Meta Section */}
        <div className="px-6 py-4 bg-card border-b border-border">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Row 1: Budget Name */}
            <div className="flex items-baseline gap-3">
              <label className="text-xs font-medium text-destructive uppercase tracking-wider min-w-[110px]">
                Budget Name
              </label>
              <span className="text-sm font-medium text-foreground">{budget.name || '-'}</span>
            </div>

            {/* Row 2: Budget Period */}
            <div className="flex items-baseline gap-3">
              <label className="text-xs font-medium text-destructive uppercase tracking-wider min-w-[110px]">
                Budget Period
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {budget.startDate ? new Date(budget.startDate).toLocaleDateString() : 'Start Date'}
                </span>
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm font-medium text-foreground">
                  {budget.endDate ? new Date(budget.endDate).toLocaleDateString() : 'End Date'}
                </span>
              </div>
            </div>

            {/* Row 3: Revision Context (if applicable) */}
            {recordId && (budget.isRevised || (!budget.isRevised && budget.revisedBudgetId)) && (
              <div className="flex items-baseline gap-3">
                <label className="text-xs font-medium text-destructive uppercase tracking-wider min-w-[110px]">
                  {budget.isRevised ? 'Revision of' : 'Revised with'}
                </label>
                <span className="text-sm text-muted-foreground">→</span>
                <button
                  onClick={handleRevisionLinkClick}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {budget.isRevised ? 'Original Budget' : 'Revised Budget'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Budget Lines Table */}
        <div className="px-6 py-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/10">
                  <th className="text-left px-4 py-2 font-semibold text-primary text-xs">
                    Analytic Name
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-primary text-xs">
                    Type
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                    Budgeted<br />Amount
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                    Achieved<br />Amount
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                    Achieved<br />%
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                    Amount to<br />Achieve
                  </th>
                </tr>
              </thead>
              <tbody>
                {budget.lines.map((line, index) => (
                  <tr
                    key={line.id}
                    className={`border-b border-border/30 transition-colors ${
                      line.type === 'Income'
                        ? 'bg-success/[0.05] hover:bg-success/[0.08]'
                        : 'bg-accent/[0.05] hover:bg-accent/[0.08]'
                    }`}
                  >
                    {/* Analytic Name */}
                    <td className="px-4 py-2 text-sm text-foreground">
                      {line.analyticName}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2 text-sm text-foreground">
                      {line.type}
                    </td>

                    {/* Budgeted Amount */}
                    <td className="px-4 py-2 text-sm text-right">
                      {typeof line.budgetedAmount === 'number' ? (
                        <span className="font-medium text-foreground">
                          {line.budgetedAmount.toLocaleString()}/-
                        </span>
                      ) : (
                        <span className="text-destructive font-bold text-xs">
                          {line.budgetedAmount}
                        </span>
                      )}
                    </td>

                    {/* Achieved Amount - Always visible */}
                    <td className="px-4 py-2 text-sm text-right">
                      {status === 'confirmed' ? (
                        <div className="inline-flex items-center gap-2">
                          {typeof line.achievedAmount === 'number' ? (
                            <span className="font-medium text-foreground">
                              {line.achievedAmount.toLocaleString()}/-
                            </span>
                          ) : (
                            <span className="text-destructive font-bold text-xs">
                              {line.achievedAmount}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toast.info('View achievement details')}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            View
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Achieved % - Always visible */}
                    <td className="px-4 py-2 text-sm text-right">
                      {status === 'confirmed' && line.achievedPercent ? (
                        <span className="font-medium text-foreground">
                          {line.achievedPercent.toFixed(2)} %
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Amount to Achieve - Always visible */}
                    <td className="px-4 py-2 text-sm text-right">
                      {status === 'confirmed' && line.amountToAchieve ? (
                        <span className="font-medium text-foreground">
                          {line.amountToAchieve.toLocaleString()}/-
                        </span>
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
      </Card>
    </div>
  );
}
