export interface PaymentCategory {
  id: number;
  name: string;
  description?: string;
  default_amount: number;
  is_recurring: boolean;
  recurring_period: 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'session';
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: number;
  player_id: number;
  category_id: number;
  amount: number;
  due_date: string;
  paid_date?: string;
  payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'online';
  transaction_id?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded' | 'partial';
  notes?: string;
  late_fee: number;
  discount_amount: number;
  created_by_user_id: number;
  created_at: string;
  updated_at?: string;
  
  // Related data (joined from other tables)
  player_name?: string;
  player_email?: string;
  category_name?: string;
  created_by_name?: string;
  days_overdue?: number;
  total_amount?: number; // amount + late_fee - discount
}

export interface PaymentPlan {
  id: number;
  player_id: number;
  plan_name: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'paused';
  created_by_user_id: number;
  created_at: string;
  
  // Related data
  player_name?: string;
  paid_installments?: number;
  remaining_amount?: number;
  next_due_date?: string;
}

export interface PaymentReminder {
  id: number;
  payment_id: number;
  reminder_date: string;
  reminder_type: 'email' | 'sms' | 'phone' | 'in_person';
  sent: boolean;
  sent_at?: string;
  created_at: string;
}

export interface PaymentHistory {
  id: number;
  payment_id: number;
  action: string;
  old_status?: string;
  new_status?: string;
  amount_change?: number;
  notes?: string;
  created_by_user_id: number;
  created_at: string;
  created_by_name?: string;
}

export interface PaymentStats {
  total_payments: number;
  paid_payments: number;
  pending_payments: number;
  overdue_payments: number;
  cancelled_payments: number;
  total_revenue: number;
  pending_revenue: number;
  overdue_revenue: number;
  avg_payment_amount: number;
  monthly_revenue: number;
  this_month_collections: number;
  payment_success_rate: number;
}

export interface PaymentRequest {
  player_id: number;
  category_id: number;
  amount: number;
  due_date: string;
  notes?: string;
  discount_amount?: number;
}

export interface PaymentUpdate {
  amount?: number;
  due_date?: string;
  payment_method?: string;
  transaction_id?: string;
  status?: string;
  notes?: string;
  late_fee?: number;
  discount_amount?: number;
}

export interface BulkPaymentRequest {
  player_ids: number[];
  category_id: number;
  amount?: number; // If not provided, use category default
  due_date: string;
  notes?: string;
}

export interface PaymentSummary {
  player_id: number;
  player_name: string;
  total_due: number;
  total_paid: number;
  total_overdue: number;
  overdue_count: number;
  last_payment_date?: string;
  payment_status: 'current' | 'behind' | 'overdue';
}