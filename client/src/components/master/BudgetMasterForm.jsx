import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import BudgetLoader from '../ui/BudgetLoader';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

export default function BudgetMasterForm({ recordId, onBack, onHome, onNew, onEdit }) {
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnalyticDetails, setSelectedAnalyticDetails] = useState(null);

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

  const handleDelete = async (id) => {
    // detete
    const url = API_ENDPOINTS.BUDGETS.DELETE_ANALYTIC(id);
    try {
      const resp = await fetch(url , {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    }
    catch(e){
      console.log("error while deleting: ",e)
    }
    
  }

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
      // Prepare budget lines - extract only IDs for analyticMasterId, preserve _id
      const linesToSave = budgetLines.map(line => {
        const lineData = {
          analyticMasterId: line.analyticMasterId?._id || line.analyticMasterId, // Extract ID if it's populated
          budgetedAmount: line.budgetedAmount,
          achievedAmount: line.achievedAmount || 0,
          achievedPercent: line.achievedPercent || 0,
          amountToAchieve: line.amountToAchieve || 0,
        };
        // Preserve the _id if it exists (for updates)
        if (line._id) {
          lineData._id = line._id;
        }
        return lineData;
      });

      const budgetData = {
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        lines: linesToSave,
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
        // Update local state with saved data
        setBudget(data.data);
        setStatus(data.data.status);
        // Reload the budget to get fresh data from server
        if (recordId) {
          await loadBudget();
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
      // If this is a revised budget, set status to 'revised', otherwise 'confirmed'
      const newStatus = budget?.isRevised ? 'revised' : 'confirmed';
      
      const response = await fetch(API_ENDPOINTS.BUDGETS.UPDATE_STATUS(id), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus(newStatus);
        setBudget(data.data);
        // Reload budget to get fresh data from server
        await loadBudget();
        toast.success(`Budget ${newStatus} successfully!`);
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
        // Navigate to the revised budget using onEdit callback
        if (onEdit && data.data._id) {
          onEdit(data.data._id);
        }
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

  const handleViewDetails = async (analyticId, analyticName) => {
    const budgetId = budget?._id || recordId;
    if (!budgetId) {
      toast.error('Budget not found');
      return;
    }

    try {
      const response = await fetch(
        API_ENDPOINTS.BUDGETS.ANALYTIC_DETAILS(budgetId, analyticId),
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (data.success) {
        setSelectedAnalyticDetails({
          ...data.data,
          analyticName,
        });
        setShowDetailsModal(true);
      } else {
        toast.error(data.message || 'Failed to fetch details');
      }
    } catch (error) {
      console.error('Fetch analytic details error:', error);
      toast.error('Failed to fetch details');
    }
  };

  const canEdit = status === 'draft';
  const showAchievedData = status === 'confirmed' || status === 'revised';

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
              disabled={isLoading || status === 'confirmed' || status === 'revised'}
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
            <Button
              onClick = {() => (handleDelete(recordId))}
            >
              Cancel
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
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${status === 'revised'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground/60'
                }`}
            >
              Revised
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${status === 'archived' ? 'text-destructive' : 'text-muted-foreground/60'
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

            {/* Revision Context - Show original budget link when viewing revised budget */}
            {budget?.originalBudgetId && (
              <div className="flex items-baseline gap-3">
                <label className="text-xs font-medium text-destructive uppercase tracking-wider min-w-[110px]">
                  Revision of
                </label>
                <span 
                  className="text-sm text-primary hover:underline cursor-pointer"
                  onClick={() => {
                    const originalId = budget.originalBudgetId?._id || budget.originalBudgetId;
                    if (originalId) {
                      onEdit(originalId);
                    }
                  }}
                >
                  {budget.originalBudgetId?.name || 'Original Budget'}
                </span>
              </div>
            )}

            {/* Show revised budget link when viewing original budget */}
            {budget?.revisedBudgetId && (
              <div className="flex items-baseline gap-3">
                <label className="text-xs font-medium text-success uppercase tracking-wider min-w-[110px]">
                  Revised Budget
                </label>
                <span 
                  className="text-sm text-primary hover:underline cursor-pointer"
                  onClick={() => {
                    const revisedId = budget.revisedBudgetId?._id || budget.revisedBudgetId;
                    if (revisedId) {
                      onEdit(revisedId);
                    }
                  }}
                >
                  {budget.revisedBudgetId?.name || 'Revised Budget'}
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
                          <span className={`px-2 py-1 rounded text-xs font-medium ${analyticType === 'Income'
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
                                  {line.achievedAmount?.toLocaleString() || '0'}/-
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const analyticId = line.analyticMasterId?._id || line.analyticMasterId;
                                    handleViewDetails(analyticId, analyticName);
                                  }}
                                  className="text-xs text-primary hover:underline font-medium"
                                >
                                  View
                                </button>
                              </div>
                            </td>

                            {/* Achieved % */}
                            <td className="px-4 py-2 text-sm text-right">
                              <span className="font-medium text-foreground">
                                {line.achievedPercent?.toFixed(2) || '0.00'} %
                              </span>
                            </td>

                            {/* Amount to Achieve */}
                            <td className="px-4 py-2 text-sm text-right">
                              <span className="font-medium text-foreground">
                                {line.amountToAchieve?.toLocaleString() || '0'}/-
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

      {/* Details Modal */}
      {showDetailsModal && selectedAnalyticDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedAnalyticDetails.analyticName} - Details
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedAnalyticDetails.analytic.type} | Period: {new Date(selectedAnalyticDetails.budgetPeriod.startDate).toLocaleDateString()} - {new Date(selectedAnalyticDetails.budgetPeriod.endDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-4 bg-muted/20 rounded-lg">
                <p className="text-lg font-semibold text-primary">
                  Total Achieved: {selectedAnalyticDetails.totalAmount.toLocaleString()}/-
                </p>
              </div>

              {selectedAnalyticDetails.details.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No {selectedAnalyticDetails.analytic.type === 'Income' ? 'invoices' : 'bills'} found for this period
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedAnalyticDetails.details.map((item, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-foreground">{item.type} #{item.number}</span>
                          <span className="mx-2 text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{item.partner}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">{item.amount.toLocaleString()}/-</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {item.lines.map((line, lineIdx) => (
                          <div key={lineIdx} className="text-sm text-muted-foreground flex items-center justify-between">
                            <span>
                              {line.product} {line.description && `(${line.description})`} - {line.quantity} × {line.unitPrice}
                            </span>
                            <span className="font-medium">{line.subtotal.toLocaleString()}/-</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowDetailsModal(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
