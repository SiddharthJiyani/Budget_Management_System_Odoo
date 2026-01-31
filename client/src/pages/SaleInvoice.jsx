import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import CustomerInvoiceForm from '../components/sale/CustomerInvoiceForm';

export default function SaleInvoice() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');

    const handleNewRecord = () => {
        navigate('/sale/invoice?view=form');
    };

    const handleBackToList = () => {
        navigate('/dashboard');
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
                    <CustomerInvoiceForm
                        recordId={recordId}
                        onBack={handleBackToList}
                        onHome={handleHome}
                        onNew={handleNewRecord}
                    />
                </div>
            </div>
        </>
    );
}
