import axios from 'axios'
import type { DashboardResponse, Transaction, TransactionPayload } from './types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

export async function getTransactions() {
  const { data } = await api.get<Transaction[]>('/api/transactions')
  return data
}

export async function getDashboard() {
  const { data } = await api.get<DashboardResponse>('/api/dashboard')
  return data
}

export async function createTransaction(payload: TransactionPayload) {
  const { data } = await api.post<Transaction>('/api/transactions', payload)
  return data
}

export async function updateTransaction(id: number, payload: TransactionPayload) {
  const { data } = await api.put<Transaction>(`/api/transactions/${id}`, payload)
  return data
}

export async function deleteTransaction(id: number) {
  await api.delete(`/api/transactions/${id}`)
}
