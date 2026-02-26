import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentData {
  id?: string;
  clientName: string;
  cpf: string;
  destination: string;
  destinationEmoji: string;
  destinationDescription: string;
  value: number;
  pixCode: string;
  orderNumber: string;
  whatsapp?: string;
}

interface PaymentContextType {
  payment: PaymentData | null;
  setPayment: (data: PaymentData) => Promise<string | null>;
  clearPayment: () => void;
  loadPayment: (id: string) => Promise<PaymentData | null>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [payment, setPaymentState] = useState<PaymentData | null>(null);

  const setPayment = async (data: PaymentData): Promise<string | null> => {
    const { data: inserted, error } = await supabase
      .from('payments')
      .insert({
        client_name: data.clientName,
        cpf: data.cpf,
        destination: data.destination,
        destination_emoji: data.destinationEmoji,
        destination_description: data.destinationDescription,
        value: data.value,
        pix_code: data.pixCode,
        order_number: data.orderNumber,
      })
      .select()
      .single();

    if (error || !inserted) return null;

    const paymentData = {
      id: inserted.id,
      clientName: inserted.client_name,
      cpf: inserted.cpf,
      destination: inserted.destination,
      destinationEmoji: inserted.destination_emoji,
      destinationDescription: inserted.destination_description,
      value: Number(inserted.value),
      pixCode: inserted.pix_code,
      orderNumber: inserted.order_number,
    };
    setPaymentState(paymentData);
    return inserted.id;
  };

  const loadPayment = async (id: string): Promise<PaymentData | null> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const paymentData: PaymentData = {
      id: data.id,
      clientName: data.client_name,
      cpf: data.cpf,
      destination: data.destination,
      destinationEmoji: data.destination_emoji,
      destinationDescription: data.destination_description,
      value: Number(data.value),
      pixCode: data.pix_code,
      orderNumber: data.order_number,
    };
    setPaymentState(paymentData);
    return paymentData;
  };

  const clearPayment = () => {
    setPaymentState(null);
  };

  return (
    <PaymentContext.Provider value={{ payment, setPayment, clearPayment, loadPayment }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error('usePayment must be used within PaymentProvider');
  return context;
};
