import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import BillPaymentForm from '../components/purchase/BillPaymentForm';

export default function PurchasePayment() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');

    const handleNewRecord = () => {
        navigate('/purchase/payment?view=form');
    };

    const handleBackToList = () => {
        navigate('/purchase/bill');
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
                    <BillPaymentForm
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
