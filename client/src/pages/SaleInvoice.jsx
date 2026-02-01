import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import CustomerInvoiceForm from '../components/sale/CustomerInvoiceForm';
import CustomerInvoiceList from '../components/sale/CustomerInvoiceList';

export default function SaleInvoice() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');
    const view = searchParams.get('view');

    // Show list view by default, form view only when id or view=form is present
    const showFormView = recordId || view === 'form';

    const handleNewRecord = () => {
        navigate('/sale/invoice?view=form');
    };

    const handleBackToList = () => {
        navigate('/sale/invoice');
    };

    const handleHome = () => {
        navigate('/dashboard');
    };

    return (
        <>
            <Header />
            <div className="header-spacer" />
            <div className="min-h-screen bg-background p-8 animate-fadeIn">
                <div className="max-w-7xl mx-auto">
                    {showFormView ? (
                        <CustomerInvoiceForm
                            recordId={recordId}
                            onBack={handleBackToList}
                            onHome={handleHome}
                            onNew={handleNewRecord}
                        />
                    ) : (
                        <CustomerInvoiceList />
                    )}
                </div>
            </div>
        </>
    );
}
