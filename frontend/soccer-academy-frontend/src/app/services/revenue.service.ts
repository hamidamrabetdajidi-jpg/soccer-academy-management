import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RevenueData {
  monthly_revenue: number[];
  monthly_labels: string[];
  yearly_revenue: number;
  growth_rate: number;
  payment_methods: { method: string; amount: number; count: number }[];
  category_breakdown: { category: string; amount: number; count: number }[];
  overdue_analysis: { days_range: string; amount: number; count: number }[];
  top_players: { player_name: string; total_paid: number; payment_count: number }[];
}

export interface DashboardMetrics {
  total_revenue: number;
  monthly_growth: number;
  payment_success_rate: number;
  average_payment: number;
  pending_amount: number;
  overdue_amount: number;
  this_month_collections: number;
  projected_monthly: number;
}

@Injectable({
  providedIn: 'root'
})
export class RevenueService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getRevenueData(): Observable<RevenueData> {
    return this.http.get<RevenueData>(`${this.baseUrl}/payments/revenue`, { 
      headers: this.getHeaders() 
    });
  }

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/payments/metrics`, { 
      headers: this.getHeaders() 
    });
  }

  getRevenueByDateRange(startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/payments/revenue/range`, {
      headers: this.getHeaders(),
      params: { start_date: startDate, end_date: endDate }
    });
  }
}