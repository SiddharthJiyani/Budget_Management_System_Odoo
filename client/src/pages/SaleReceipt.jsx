import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import InvoicePaymentForm from '../components/sale/InvoicePaymentForm';

export default function SaleReceipt() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');

    const handleNewRecord = () => {
        navigate('/sale/receipt?view=form');
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
                    <InvoicePaymentForm
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
