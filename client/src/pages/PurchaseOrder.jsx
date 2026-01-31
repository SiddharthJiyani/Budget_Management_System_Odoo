import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PurchaseOrderForm from '../components/purchase/PurchaseOrderForm';

export default function PurchaseOrder() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const view = searchParams.get('view') || 'form';
    const recordId = searchParams.get('id');

    const handleNewRecord = () => {
        navigate('/purchase/order?view=form');
    };

    const handleBackToList = () => {
        navigate('/dashboard');
    };

    const handleHome = () => {
        navigate('/dashboard');
    };

    const renderContent = () => {
        return (
            <PurchaseOrderForm
                recordId={recordId}
                onBack={handleBackToList}
                onHome={handleHome}
                onNew={handleNewRecord}
            />
        );
    };

    return (
        <>
            <Header />
            <div className="header-spacer" />
            <div className="min-h-screen bg-background p-8 animate-fadeIn">
                <div className="max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </div>
        </>
    );
}
