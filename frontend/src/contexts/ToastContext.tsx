import React, { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const success = (message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
        fontWeight: '500',
      },
    });
  };

  const error = (message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: '#fff',
        fontWeight: '500',
      },
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        background: '#F59E0B',
        color: '#fff',
        fontWeight: '500',
      },
    });
  };

  const dismiss = () => {
    toast.dismiss();
  };

  return (
    <ToastContext.Provider value={{ success, error, loading, dismiss }}>
      {children}
      <Toaster
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
};
