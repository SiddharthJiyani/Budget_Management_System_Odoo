import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import SalesOrderForm from '../components/sale/SalesOrderForm';
import SalesOrderList from '../components/sale/SalesOrderList';

export default function SaleOrder() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const recordId = searchParams.get('id');
    const view = searchParams.get('view');

    // Show form if we have an ID or view=form
    const showForm = recordId || view === 'form';

    const handleNewRecord = () => {
        navigate('/sale/order?view=form');
    };

    const handleBackToList = () => {
        navigate('/sale/order');
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
                    {showForm ? (
                        <SalesOrderForm
                            recordId={recordId}
                            onBack={handleBackToList}
                            onHome={handleHome}
                            onNew={handleNewRecord}
                        />
                    ) : (
                        <SalesOrderList />
                    )}
                </div>
            </div>
        </>
    );
}
