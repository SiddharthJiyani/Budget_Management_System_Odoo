import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 className="text-[150px] md:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-pulse leading-none">
            404
          </h1>
          
          {/* Glowing effect */}
          <div className="absolute inset-0 blur-3xl opacity-30">
            <div className="text-[150px] md:text-[200px] font-bold bg-gradient-to-r from-primary via-accent to-primary leading-none">
              404
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Oops! Page Not Found
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to another location.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-all duration-300 border border-border"
          >
            Go Home
          </button>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;

