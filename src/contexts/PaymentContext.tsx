import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PaymentData {
  clientName: string;
  cpf: string;
  destination: string;
  destinationEmoji: string;
  destinationDescription: string;
  value: number;
  pixCode: string;
  orderNumber: string;
}

interface PaymentContextType {
  payment: PaymentData | null;
  setPayment: (data: PaymentData) => void;
  clearPayment: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

const STORAGE_KEY = 'decolar_payment_data';

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [payment, setPaymentState] = useState<PaymentData | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setPayment = (data: PaymentData) => {
    setPaymentState(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const clearPayment = () => {
    setPaymentState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <PaymentContext.Provider value={{ payment, setPayment, clearPayment }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error('usePayment must be used within PaymentProvider');
  return context;
};
