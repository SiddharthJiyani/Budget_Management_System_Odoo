import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import VendorBillForm from '../components/purchase/VendorBillForm';

export default function PurchaseBill() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');

    const handleNewRecord = () => {
        navigate('/purchase/bill?view=form');
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
                    <VendorBillForm
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
