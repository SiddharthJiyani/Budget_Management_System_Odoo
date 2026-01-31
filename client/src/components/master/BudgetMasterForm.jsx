import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import BudgetLoader from '../ui/BudgetLoader';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

export default function BudgetMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [budget, setBudget] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [budgetLines, setBudgetLines] = useState([]);
  const [status, setStatus] = useState('draft');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);
  const [errors, setErrors] = useState({});

  // Load existing budget if recordId provided
  useEffect(() => {
    if (recordId) {
      loadBudget();
    } else {
      // Reset for new budget
      setFormData({ name: '', startDate: '', endDate: '' });
      setBudgetLines([]);
      setStatus('draft');
    }
  }, [recordId]);

  const loadBudget = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.BUDGETS.BY_ID(recordId), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        const budgetData = data.data;
        setBudget(budgetData);
        setFormData({
          name: budgetData.name,
          startDate: budgetData.startDate ? budgetData.startDate.split('T')[0] : '',
          endDate: budgetData.endDate ? budgetData.endDate.split('T')[0] : '',
        });
        setBudgetLines(budgetData.lines || []);
        setStatus(budgetData.status);
      } else {
        toast.error(data.message || 'Failed to load budget');
      }
    } catch (error) {
      console.error('Load budget error:', error);
      toast.error('Failed to load budget');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch analytics when date range is selected
  useEffect(() => {
    if (formData.startDate && formData.endDate && !recordId) {
      fetchAnalyticsByDateRange();
    }
  }, [formData.startDate, formData.endDate]);

  const fetchAnalyticsByDateRange = async () => {
    setIsFetchingAnalytics(true);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.ANALYTICS.BY_DATE_RANGE}?startDate=${formData.startDate}&endDate=${formData.endDate}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
        // Create budget lines - only store reference and amounts, NOT name/type
        const lines = data.data.map(analytic => ({
          analyticMasterId: analytic._id,
          budgetedAmount: 0,
          achievedAmount: 0,
          achievedPercent: 0,
          amountToAchieve: 0,
        }));
        setBudgetLines(lines);
        toast.success(`Found ${data.data.length} analytics for selected period`);
      } else {
        toast.error(data.message || 'No analytics found');
        setBudgetLines([]);
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
      toast.error('Failed to fetch analytics');
      setBudgetLines([]);
    } finally {
      setIsFetchingAnalytics(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLineChange = (index, field, value) => {
    const updatedLines = [...budgetLines];
    updatedLines[index][field] = field === 'budgetedAmount' ? parseFloat(value) || 0 : value;

    // Recalculate metrics
    if (field === 'budgetedAmount' || field === 'achievedAmount') {
      const line = updatedLines[index];
      if (line.budgetedAmount > 0) {
        line.achievedPercent = (line.achievedAmount / line.budgetedAmount) * 100;
        line.amountToAchieve = line.budgetedAmount - line.achievedAmount;
      }
    }

    setBudgetLines(updatedLines);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Budget name is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be greater than or equal to start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      const budgetData = {
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        lines: budgetLines,
      };

      const url = recordId
        ? API_ENDPOINTS.BUDGETS.BY_ID(recordId)
        : API_ENDPOINTS.BUDGETS.BASE;
      const method = recordId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(budgetData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Budget ${recordId ? 'updated' : 'created'} successfully!`);
        if (!recordId) {
          // Navigate to the newly created budget
          setBudget(data.data);
          setStatus(data.data.status);
        }
      } else {
        toast.error(data.message || 'Failed to save budget');
      }
    } catch (error) {
      console.error('Save budget error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!budget?._id && !recordId) {
      toast.error('Please save the budget first');
      return;
    }

    setIsLoading(true);
    try {
      const id = budget?._id || recordId;
      const response = await fetch(API_ENDPOINTS.BUDGETS.UPDATE_STATUS(id), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'confirmed' }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('confirmed');
        setBudget(data.data);
        toast.success('Budget confirmed successfully!');
      } else {
        toast.error(data.message || 'Failed to confirm budget');
      }
    } catch (error) {
      console.error('Confirm budget error:', error);
      toast.error('Failed to confirm budget');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!budget?._id && !recordId) {
      toast.error('No budget to revise');
      return;
    }

    setIsLoading(true);
    try {
      const id = budget?._id || recordId;
      const response = await fetch(API_ENDPOINTS.BUDGETS.REVISE(id), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Revised budget created successfully!');
        // Navigate to the revised budget
        setBudget(data.data);
        setFormData({
          name: data.data.name,
          startDate: data.data.startDate.split('T')[0],
          endDate: data.data.endDate.split('T')[0],
        });
        setBudgetLines(data.data.lines);
        setStatus(data.data.status);
      } else {
        toast.error(data.message || 'Failed to create revision');
      }
    } catch (error) {
      console.error('Revise budget error:', error);
      toast.error('Failed to create revision');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!budget?._id && !recordId) {
      toast.error('No budget to archive');
      return;
    }

    try {
      const id = budget?._id || recordId;
      const response = await fetch(API_ENDPOINTS.BUDGETS.BY_ID(id), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Budget archived');
        onBack();
      } else {
        toast.error(data.message || 'Failed to archive budget');
      }
    } catch (error) {
      console.error('Archive budget error:', error);
      toast.error('Failed to archive budget');
    }
  };

  const canEdit = status === 'draft' || status === 'revised';
  const showAchievedData = status === 'confirmed';

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Budget</h1>
        <p className="text-sm text-muted-foreground">
          {recordId ? (budget?.isRevised ? 'Form View of Revised Budget' : 'Form View of Original Budget') : 'New Budget'}
        </p>
      </div>

      <Card className="overflow-hidden neu-card">
        {/* Action Bar & Status Ribbon */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20">
          {/* Left: Action Buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={onNew} variant="outline" size="sm">
              New
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={isLoading || !canEdit}
            >
              {isLoading ? 'Saving...' : 'Save'}
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
            <div className="flex-1" />
            <Button onClick={onHome} variant="outline" size="sm">
              <Home size={16} />
            </Button>
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft size={16} />
            </Button>
          </div>

          {/* Right: Status Stepper */}
          <div className="flex items-center gap-1">
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${status === 'draft' ? 'text-foreground' : 'text-muted-foreground/60'
                }`}
            >
              Draft
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${status === 'confirmed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground/60'
                }`}
            >
              Confirm
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${status === 'revised' ? 'text-primary' : 'text-muted-foreground/60'
                }`}
            >
              Revised
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${status === 'canceled' ? 'text-destructive' : 'text-muted-foreground/60'
                }`}
            >
              Cancelled
            </span>
          </div>
        </div>

        {/* Budget Meta Section */}
        <div className="px-6 py-4 bg-card border-b border-border">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Budget Name */}
            <div className="flex items-baseline gap-3">
              <label className="text-xs font-medium text-pretty uppercase tracking-wider min-w-[110px]">
                Budget Name
              </label>
              {canEdit ? (
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter budget name (e.g., January 2026)"
                  error={errors.name}
                  className="max-w-2xl"
                />
              ) : (
                <span className="text-sm font-medium text-foreground">{formData.name || '-'}</span>
              )}
            </div>

            {/* Budget Period */}
            <div className="flex items-baseline gap-3">
              <label className="text-xs font-medium text-pretty uppercase tracking-wider min-w-[110px]">
                Budget Period
              </label>
              {canEdit && !recordId ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    error={errors.startDate}
                  />
                  <span className="text-sm text-muted-foreground">To</span>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    error={errors.endDate}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Start Date'}
                  </span>
                  <span className="text-sm text-muted-foreground">To</span>
                  <span className="text-sm font-medium text-foreground">
                    {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'End Date'}
                  </span>
                </div>
              )}
            </div>

            {/* Revision Context */}
            {budget?.originalBudgetId && (
              <div className="flex items-baseline gap-3">
                <label className="text-xs font-medium text-destructive uppercase tracking-wider min-w-[110px]">
                  Revision of
                </label>
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Original Budget
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Budget Lines Table */}
        <div className="px-6 py-4">
          {isFetchingAnalytics ? (
            <BudgetLoader />
          ) : budgetLines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {formData.startDate && formData.endDate
                  ? 'No analytics found for the selected period'
                  : 'Please select a budget period to load analytics'}
              </p>
            </div>
          ) : (
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
                    {showAchievedData && (
                      <>
                        <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                          Achieved<br />Amount
                        </th>
                        <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                          Achieved<br />%
                        </th>
                        <th className="text-right px-4 py-2 font-semibold text-primary text-xs">
                          Amount to<br />Achieve
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((line, index) => {
                    // Get analytic data - either from populated analyticMasterId or local analytics array
                    const analyticData = line.analyticMasterId?._id 
                      ? line.analyticMasterId  // Populated from backend
                      : analytics.find(a => a._id === line.analyticMasterId); // Local array for new budgets
                    
                    const analyticName = analyticData?.name || 'Unknown';
                    const analyticType = analyticData?.type || 'Expense';
                    
                    return (
                    <tr
                      key={line._id || index}
                      className={`border-b border-border/30 transition-colors ${analyticType === 'Income'
                          ? 'bg-success/[0.05] hover:bg-success/[0.08]'
                          : 'bg-accent/[0.05] hover:bg-accent/[0.08]'
                        }`}
                    >
                      {/* Analytic Name */}
                      <td className="px-4 py-2 text-sm text-foreground">
                        {analyticName}
                      </td>

                      {/* Type - Read-only from AnalyticMaster */}
                      <td className="px-4 py-2 text-sm text-foreground">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analyticType === 'Income' 
                            ? 'bg-success/20 text-success' 
                            : 'bg-accent/20 text-accent-foreground'
                        }`}>
                          {analyticType}
                        </span>
                      </td>

                      {/* Budgeted Amount */}
                      <td className="px-4 py-2 text-sm text-right">
                        {canEdit ? (
                          <input
                            type="number"
                            value={line.budgetedAmount}
                            onChange={(e) => handleLineChange(index, 'budgetedAmount', e.target.value)}
                            className="w-32 px-2 py-1 rounded bg-input text-foreground border border-border text-right"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <span className="font-medium text-foreground">
                            {line.budgetedAmount.toLocaleString()}/-
                          </span>
                        )}
                      </td>

                      {/* Achieved columns (only when confirmed) */}
                      {showAchievedData && (
                        <>
                          {/* Achieved Amount */}
                          <td className="px-4 py-2 text-sm text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {line.achievedAmount.toLocaleString()}/-
                              </span>
                              <button
                                type="button"
                                onClick={() => toast.info('View achievement details')}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                View
                              </button>
                            </div>
                          </td>

                          {/* Achieved % */}
                          <td className="px-4 py-2 text-sm text-right">
                            <span className="font-medium text-foreground">
                              {line.achievedPercent.toFixed(2)} %
                            </span>
                          </td>

                          {/* Amount to Achieve */}
                          <td className="px-4 py-2 text-sm text-right">
                            <span className="font-medium text-foreground">
                              {line.amountToAchieve.toLocaleString()}/-
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
