import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AtmDepositResponse {
  depositId: string;
  accountNumber: string;
  accountHolder: string;
  bankType: 'BANK_A' | 'BANK_B';
  amount: number;
  amountCents: string;
  newBalance: number;
  newBalanceCents: string;
  status: string;
  timestamp: string;
}

export const depositToAccount = async (
  accountNumber: string,
  amount: number
): Promise<AtmDepositResponse> => {
  const response = await apiClient.post<AtmDepositResponse>('/deposit', {
    accountNumber,
    amount,
  });
  return response.data;
};
