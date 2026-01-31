import React from 'react';

const Loader = () => {
  return (
    <div className="flex items-center justify-center mt-8">
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
    </div>
  );
};

export default Loader;

