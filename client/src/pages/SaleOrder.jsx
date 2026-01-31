import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import SalesOrderForm from '../components/sale/SalesOrderForm';

export default function SaleOrder() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');

    const handleNewRecord = () => {
        navigate('/sale/order?view=form');
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
                    <SalesOrderForm
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
