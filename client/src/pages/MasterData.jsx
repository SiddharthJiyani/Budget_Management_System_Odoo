import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import MasterDataSelector from '../components/master/MasterDataSelector';
import ContactMasterList from '../components/master/ContactMasterList';
import ContactMasterForm from '../components/master/ContactMasterForm';
import ProductMasterList from '../components/master/ProductMasterList';
import ProductMasterForm from '../components/master/ProductMasterForm';
import AnalyticalMasterList from '../components/master/AnalyticalMasterList';
import AnalyticalMasterForm from '../components/master/AnalyticalMasterForm';

export default function MasterData() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get master type from URL or default to null (shows selector)
  const masterType = searchParams.get('type');
  const view = searchParams.get('view') || 'list'; // 'list' or 'form'
  const recordId = searchParams.get('id'); // for editing existing record

  const handleSelectMasterType = (type) => {
    navigate(`/master-data?type=${type}&view=list`);
  };

  const handleNewRecord = () => {
    navigate(`/master-data?type=${masterType}&view=form`);
  };

  const handleEditRecord = (id) => {
    navigate(`/master-data?type=${masterType}&view=form&id=${id}`);
  };

  const handleBackToList = () => {
    navigate(`/master-data?type=${masterType}&view=list`);
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  const renderContent = () => {
    // If no master type selected, show selector
    if (!masterType) {
      return <MasterDataSelector onSelect={handleSelectMasterType} />;
    }

    // Render based on master type and view
    if (view === 'list') {
      switch (masterType) {
        case 'contact':
          return (
            <ContactMasterList
              onNew={handleNewRecord}
              onEdit={handleEditRecord}
              onHome={handleHome}
            />
          );
        case 'product':
          return (
            <ProductMasterList
              onNew={handleNewRecord}
              onEdit={handleEditRecord}
              onHome={handleHome}
            />
          );
        case 'analytical':
          return (
            <AnalyticalMasterList
              onNew={handleNewRecord}
              onEdit={handleEditRecord}
              onHome={handleHome}
            />
          );
        default:
          return <MasterDataSelector onSelect={handleSelectMasterType} />;
      }
    } else if (view === 'form') {
      switch (masterType) {
        case 'contact':
          return (
            <ContactMasterForm
              recordId={recordId}
              onBack={handleBackToList}
              onHome={handleHome}
              onNew={handleNewRecord}
            />
          );
        case 'product':
          return (
            <ProductMasterForm
              recordId={recordId}
              onBack={handleBackToList}
              onHome={handleHome}
              onNew={handleNewRecord}
            />
          );
        case 'analytical':
          return (
            <AnalyticalMasterForm
              recordId={recordId}
              onBack={handleBackToList}
              onHome={handleHome}
              onNew={handleNewRecord}
            />
          );
        default:
          return <MasterDataSelector onSelect={handleSelectMasterType} />;
      }
    }
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
