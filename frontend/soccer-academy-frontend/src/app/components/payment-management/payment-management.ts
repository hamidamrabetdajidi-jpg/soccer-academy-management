import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Payment, PaymentCategory, PaymentStats } from '../../models/payment.model';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent  } from '../Shared/footer/footer.component';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule,SidebarComponent,FooterComponent],
  templateUrl: './payment-management.html',
  styleUrls: ['./payment-management.scss']
})

export class PaymentManagementComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart', { static: false }) revenueChartRef!: ElementRef;
  @ViewChild('statusChart', { static: false }) statusChartRef!: ElementRef;
  payments: Payment[] = [];
  categories: PaymentCategory[] = [];
  stats: PaymentStats | null = null;
  
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
    // Add chart properties
  revenueChart: Chart | null = null;
  statusChart: Chart | null = null;
  
  // Chart data
  monthlyRevenueData: number[] = [];
  monthlyLabels: string[] = [];
  // Modal states
  showAddPaymentModal = false;
  showEditModal = false;
  showPaymentModal = false;
  showDeleteModal = false;
  showBulkPaymentModal = false;
  
  selectedPayment: Payment | null = null;
  editingPayment: Payment | null = null;
  paymentToDelete: Payment | null = null;
  
  // Forms
  paymentForm!: FormGroup;
  markPaidForm!: FormGroup;
  bulkPaymentForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  selectedStatus = '';
  selectedCategory = '';
  selectedPaymentMethod = '';
  selectedPlayer = '';
  startDate = '';
  endDate = '';
  overdueOnly = false;
  sortBy = 'due_date';
  sortOrder = 'desc';
  searchTimeout: any;
  
  // View modes
  viewMode: 'list' | 'cards' | 'summary' = 'cards';
  players: any[] = [];

// Add this method
loadPlayers(): void {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  this.http.get<any>('http://localhost:3000/api/players', { headers })
    .subscribe({
      next: (response) => {
        this.players = response.players || [];
        console.log('👥 Players loaded for payments:', this.players.length);
      },
      error: (error) => {
        console.error('❌ Error loading players:', error);
      }
    });
}
  // Payment status options
  paymentStatuses = [
    { value: 'pending', label: 'Pending', color: 'warning', icon: 'fas fa-clock' },
    { value: 'paid', label: 'Paid', color: 'success', icon: 'fas fa-check-circle' },
    { value: 'overdue', label: 'Overdue', color: 'danger', icon: 'fas fa-exclamation-triangle' },
    { value: 'cancelled', label: 'Cancelled', color: 'secondary', icon: 'fas fa-times-circle' },
    { value: 'refunded', label: 'Refunded', color: 'info', icon: 'fas fa-undo' },
    { value: 'partial', label: 'Partial', color: 'primary', icon: 'fas fa-adjust' }
  ];
  
  // Payment methods
  paymentMethods = [
    { value: 'cash', label: 'Cash', icon: 'fas fa-money-bill' },
    { value: 'credit_card', label: 'Credit Card', icon: 'fas fa-credit-card' },
    { value: 'debit_card', label: 'Debit Card', icon: 'fas fa-credit-card' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: 'fas fa-university' },
    { value: 'check', label: 'Check', icon: 'fas fa-money-check' },
    { value: 'online', label: 'Online Payment', icon: 'fas fa-laptop' }
  ];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  this.loadPaymentCategories();
  this.loadPlayers(); // Add this line
  this.loadPayments();
  }

  initializeForms(): void {
    this.paymentForm = this.formBuilder.group({
      player_id: ['', [Validators.required]],
      category_id: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      due_date: ['', [Validators.required]],
      notes: [''],
      discount_amount: [0, [Validators.min(0)]]
    });

    this.markPaidForm = this.formBuilder.group({
      payment_method: ['cash', [Validators.required]],
      transaction_id: [''],
      paid_amount: ['', [Validators.min(0.01)]],
      notes: ['']
    });

    this.bulkPaymentForm = this.formBuilder.group({
      player_ids: [[], [Validators.required]],
      category_id: ['', [Validators.required]],
      amount: [''],
      due_date: ['', [Validators.required]],
      notes: ['']
    });
  }

  loadPaymentCategories(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/payment-categories', { headers })
      .subscribe({
        next: (response) => {
          this.categories = response.categories || [];
          console.log('📊 Payment categories loaded:', this.categories.length);
        },
        error: (error) => {
          console.error('❌ Error loading payment categories:', error);
        }
      });
  }

loadPayments(): void {
  this.isLoading = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Build query parameters with debugging
  let queryParams = new URLSearchParams();
  
  console.log('🔍 Building search parameters:');
  
  if (this.searchTerm && this.searchTerm.trim() !== '') {
    queryParams.append('search', this.searchTerm.trim());
    console.log('  - Search term:', this.searchTerm.trim());
  }
  
  if (this.selectedStatus && this.selectedStatus !== '') {
    queryParams.append('status', this.selectedStatus);
    console.log('  - Status filter:', this.selectedStatus);
  }
  
  if (this.selectedCategory && this.selectedCategory !== '') {
    queryParams.append('category_id', this.selectedCategory);
    console.log('  - Category filter:', this.selectedCategory);
  }
  
  if (this.selectedPaymentMethod && this.selectedPaymentMethod !== '') {
    queryParams.append('payment_method', this.selectedPaymentMethod);
    console.log('  - Payment method filter:', this.selectedPaymentMethod);
  }
  
  if (this.startDate && this.startDate !== '') {
    queryParams.append('start_date', this.startDate);
    console.log('  - Start date filter:', this.startDate);
  }
  
  if (this.endDate && this.endDate !== '') {
    queryParams.append('end_date', this.endDate);
    console.log('  - End date filter:', this.endDate);
  }
  
  if (this.overdueOnly) {
    queryParams.append('overdue_only', 'true');
    console.log('  - Overdue only:', this.overdueOnly);
  }
  
  queryParams.append('sort_by', this.sortBy);
  queryParams.append('sort_order', this.sortOrder);
  console.log('  - Sort:', this.sortBy, this.sortOrder);

  const url = `http://localhost:3000/api/payments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  console.log('💳 Loading payments with URL:', url);
  console.log('🔍 Query string:', queryParams.toString());

  this.http.get<any>(url, { headers })
    .subscribe({
      next: (response) => {
        console.log('✅ Payments response received:', response);
        this.payments = response.payments || [];
        this.stats = response.stats || null;
        this.isLoading = false;
        console.log('💰 Loaded payments:', this.payments.length);
      },
      error: (error) => {
        console.error('❌ Error loading payments:', error);
        this.error = error.error?.error || 'Failed to load payments';
        this.payments = [];
        this.isLoading = false;
      }
    });


    this.http.get<any>(url, { headers })
    .subscribe({
      next: (response) => {
        this.payments = response.payments || [];
        this.stats = response.stats || null;
        this.isLoading = false;
        console.log('💰 Loaded payments:', this.payments.length);
        
        // Refresh charts if in summary view
        if (this.viewMode === 'summary') {
          setTimeout(() => {
            this.createSummaryCharts();
          }, 100);
        }
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to load payments';
        this.payments = [];
        this.isLoading = false;
        console.error('❌ Error loading payments:', error);
      }
    });
}
  // Modal methods
  openAddPaymentModal(): void {
    this.showAddPaymentModal = true;
    this.paymentForm.reset();
    this.paymentForm.patchValue({
      due_date: new Date().toISOString().split('T')[0],
      discount_amount: 0
    });
    this.error = '';
    this.successMessage = '';
  }

  closeAddPaymentModal(): void {
    this.showAddPaymentModal = false;
    this.paymentForm.reset();
  }

  openPaymentModal(payment: Payment): void {
    this.selectedPayment = payment;
    this.showPaymentModal = true;
    this.markPaidForm.reset();
    this.markPaidForm.patchValue({
      payment_method: 'cash',
      paid_amount: payment.total_amount || payment.amount
    });
    this.error = '';
    this.successMessage = '';
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPayment = null;
    this.markPaidForm.reset();
  }

  openEditModal(payment: Payment): void {
    this.editingPayment = payment;
    this.showEditModal = true;
    
    this.paymentForm.patchValue({
      player_id: payment.player_id,
      category_id: payment.category_id,
      amount: payment.amount,
      due_date: payment.due_date,
      notes: payment.notes,
      discount_amount: payment.discount_amount
    });

    this.error = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingPayment = null;
    this.paymentForm.reset();
  }

  openDeleteModal(payment: Payment): void {
    this.paymentToDelete = payment;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.paymentToDelete = null;
  }

  // CRUD operations
savePayment(): void {
  console.log('💾 Save payment called');
  console.log('📝 Editing payment:', this.editingPayment ? this.editingPayment.id : 'None');
  
  if (this.paymentForm.invalid) {
    console.log('❌ Form is invalid');
    // this.debugFormValidation();
    this.markFormGroupTouched();
    return;
  }

  console.log('✅ Form is valid, proceeding...');

  if (this.editingPayment) {
    console.log('🔄 Calling updatePayment');
    this.updatePayment();
  } else {
    console.log('➕ Calling createPayment');
    this.createPayment();
  }
}

  createPayment(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const paymentData = this.paymentForm.value;

    this.http.post('http://localhost:3000/api/payments', paymentData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Payment created successfully!';
          this.closeAddPaymentModal();
          this.loadPayments();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create payment';
          this.isSubmitting = false;
        }
      });
  }

  updatePayment(): void {
  if (!this.editingPayment) {
    console.error('❌ No editing payment set');
    return;
  }
  
  console.log('🔄 Updating payment:', this.editingPayment.id);
  console.log('📝 Form data:', this.paymentForm.value);
  
  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const paymentData = {
    ...this.paymentForm.value,
    // Ensure proper data types
    player_id: parseInt(this.paymentForm.value.player_id),
    category_id: parseInt(this.paymentForm.value.category_id),
    amount: parseFloat(this.paymentForm.value.amount),
    discount_amount: parseFloat(this.paymentForm.value.discount_amount) || 0
  };

  console.log('📤 Sending update data:', paymentData);

  this.http.put(`http://localhost:3000/api/payments/${this.editingPayment.id}`, paymentData, { headers })
    .subscribe({
      next: (response: any) => {
        console.log('✅ Update response:', response);
        this.successMessage = 'Payment updated successfully!';
        this.closeEditModal();
        this.loadPayments();
        this.isSubmitting = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Update error:', error);
        console.error('❌ Error details:', error.error);
        this.error = error.error?.error || 'Failed to update payment';
        this.isSubmitting = false;
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          this.error = '';
        }, 5000);
      }
    });
}

  markPaymentPaid(): void {
    if (!this.selectedPayment || this.markPaidForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const paymentData = this.markPaidForm.value;

    this.http.post(`http://localhost:3000/api/payments/${this.selectedPayment.id}/mark-paid`, paymentData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Payment marked as paid successfully!';
          this.closePaymentModal();
          this.loadPayments();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to mark payment as paid';
          this.isSubmitting = false;
        }
      });
  }

  deletePayment(): void {
    if (!this.paymentToDelete) return;
    
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(`http://localhost:3000/api/payments/${this.paymentToDelete.id}`, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Payment deleted successfully!';
          this.closeDeleteModal();
          this.loadPayments();
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to delete payment';
          this.closeDeleteModal();
        }
      });
  }

  // Helper methods
  getStatusLabel(status: string): string {
    const statusObj = this.paymentStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  }

  getStatusColor(status: string): string {
    const statusObj = this.paymentStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'secondary';
  }

  getStatusIcon(status: string): string {
    const statusObj = this.paymentStatuses.find(s => s.value === status);
    return statusObj ? statusObj.icon : 'fas fa-question';
  }

  getPaymentMethodLabel(method: string): string {
    const methodObj = this.paymentMethods.find(m => m.value === method);
    return methodObj ? methodObj.label : method;
  }

  getPaymentMethodIcon(method: string): string {
    const methodObj = this.paymentMethods.find(m => m.value === method);
    return methodObj ? methodObj.icon : 'fas fa-money-bill';
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }

  getDaysOverdue(payment: Payment): number {
    if (payment.status !== 'overdue' || !payment.due_date) return 0;
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Search and filter methods
 // Add these debug methods
onSearchChange(): void {
  console.log('🔍 Search input changed to:', this.searchTerm);
  console.log('🔍 Search term length:', this.searchTerm?.length || 0);
  
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    console.log('🔍 Executing search after delay with term:', this.searchTerm);
    this.loadPayments();
  }, 500);
}

onFilterChange(): void {
  console.log('🔧 Filter changed - Current values:');
  console.log('  - Status:', this.selectedStatus);
  console.log('  - Category:', this.selectedCategory);
  console.log('  - Payment Method:', this.selectedPaymentMethod);
  console.log('  - Start Date:', this.startDate);
  console.log('  - End Date:', this.endDate);
  console.log('  - Overdue Only:', this.overdueOnly);
  
  this.loadPayments();
}

clearFilters(): void {
  console.log('🧹 Clearing all filters');
  
  this.searchTerm = '';
  this.selectedStatus = '';
  this.selectedCategory = '';
  this.selectedPaymentMethod = '';
  this.selectedPlayer = '';
  this.startDate = '';
  this.endDate = '';
  this.overdueOnly = false;
  
  console.log('🧹 Filters cleared, reloading payments');
  this.loadPayments();
}

// Add a test search method
testSearch(): void {
  console.log('🧪 Testing search functionality');
  this.searchTerm = 'John';
  this.onSearchChange();
}

// Add a test filter method
testFilter(): void {
  console.log('🧪 Testing filter functionality');
  this.selectedStatus = 'pending';
  this.onFilterChange();
}
 

  // Form validation
 isFieldInvalid(fieldName: string, formName: 'payment' | 'markPaid' | 'bulk' = 'payment'): boolean {
  let form;
  switch (formName) {
    case 'markPaid':
      form = this.markPaidForm;
      break;
    case 'bulk':
      form = this.bulkPaymentForm;
      break;
    default:
      form = this.paymentForm;
  }
  
  const field = form.get(fieldName);
  return !!(field && field.invalid && (field.dirty || field.touched));
}
private markFormGroupTouched(formName: 'payment' | 'markPaid' | 'bulk' = 'payment'): void {
  let form;
  switch (formName) {
    case 'markPaid':
      form = this.markPaidForm;
      break;
    case 'bulk':
      form = this.bulkPaymentForm;
      break;
    default:
      form = this.paymentForm;
  }
  
  Object.keys(form.controls).forEach(key => {
    const control = form.get(key);
    if (control) {
      control.markAsTouched();
    }
  });
}
// Add these methods to your component

onCategoryChange(event: any): void {
  const categoryId = event.target.value;
  const category = this.categories.find(c => c.id == categoryId);
  
  if (category) {
    this.paymentForm.patchValue({
      amount: category.default_amount
    });
  }
}

// Bulk payment methods
selectedPlayerIds: number[] = [];

toggleSelectAllPlayers(event: any): void {
  const isChecked = event.target.checked;
  this.selectedPlayerIds = isChecked ? [1, 2, 3] : []; // Replace with actual player IDs
  
  // Update all checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="player-"]');
  checkboxes.forEach((checkbox: any) => {
    checkbox.checked = isChecked;
  });
}

togglePlayerSelection(playerId: number, event: any): void {
  const isChecked = event.target.checked;
  
  if (isChecked) {
    if (!this.selectedPlayerIds.includes(playerId)) {
      this.selectedPlayerIds.push(playerId);
    }
  } else {
    this.selectedPlayerIds = this.selectedPlayerIds.filter(id => id !== playerId);
  }
  
  // Update bulk form
  this.bulkPaymentForm.patchValue({
    player_ids: this.selectedPlayerIds
  });
}

createBulkPayments(): void {
  if (this.bulkPaymentForm.invalid || this.selectedPlayerIds.length === 0) {
    this.error = 'Please select at least one player and fill in all required fields.';
    return;
  }

  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const bulkData = {
    ...this.bulkPaymentForm.value,
    player_ids: this.selectedPlayerIds
  };

  // Create individual payments for each selected player
  const paymentPromises = this.selectedPlayerIds.map(playerId => {
    const paymentData = {
      player_id: playerId,
      category_id: bulkData.category_id,
      amount: bulkData.amount || this.categories.find(c => c.id == bulkData.category_id)?.default_amount,
      due_date: bulkData.due_date,
      notes: bulkData.notes
    };

    return this.http.post('http://localhost:3000/api/payments', paymentData, { headers }).toPromise();
  });

  Promise.all(paymentPromises)
    .then(() => {
      this.successMessage = `Successfully created ${this.selectedPlayerIds.length} payments!`;
      this.showBulkPaymentModal = false;
      this.bulkPaymentForm.reset();
      this.selectedPlayerIds = [];
      this.loadPayments();
      this.isSubmitting = false;
    })
    .catch((error) => {
      this.error = 'Failed to create some payments. Please try again.';
      this.isSubmitting = false;
      console.error('❌ Bulk payment error:', error);
    });
}
// Add these methods to your PaymentManagementComponent class

ngAfterViewInit(): void {
  // Create charts after view is initialized
  if (this.viewMode === 'summary') {
    setTimeout(() => {
      this.createSummaryCharts();
    }, 100);
  }
}

createSummaryCharts(): void {
  if (this.payments.length === 0) return;
  
  this.prepareChartData();
  this.createRevenueChart();
  this.createStatusChart();
}

prepareChartData(): void {
  // Prepare monthly revenue data from payments
  const monthlyData = new Map<string, number>();
  const last6Months = [];
  
  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    last6Months.push({ key: monthKey, label: monthLabel });
    monthlyData.set(monthKey, 0);
  }
  
  // Calculate revenue by month from paid payments
  this.payments
    .filter(p => p.status === 'paid' && p.paid_date)
    .forEach(payment => {
      const monthKey = payment.paid_date!.slice(0, 7);
      if (monthlyData.has(monthKey)) {
        const currentAmount = monthlyData.get(monthKey) || 0;
        monthlyData.set(monthKey, currentAmount + (payment.total_amount || payment.amount));
      }
    });
  
  this.monthlyLabels = last6Months.map(m => m.label);
  this.monthlyRevenueData = last6Months.map(m => monthlyData.get(m.key) || 0);
}

createRevenueChart(): void {
  if (!this.revenueChartRef) return;
  
  // Destroy existing chart
  if (this.revenueChart) {
    this.revenueChart.destroy();
  }
  
  const ctx = this.revenueChartRef.nativeElement.getContext('2d');
  this.revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: this.monthlyLabels,
      datasets: [{
        label: 'Monthly Revenue',
        data: this.monthlyRevenueData,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#28a745',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Revenue Trend (Last 6 Months)',
          font: { size: 16, weight: 'bold' }
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => '$' + value.toLocaleString()
          }
        }
      }
    }
  });
}

createStatusChart(): void {
  if (!this.statusChartRef) return;
  
  // Destroy existing chart
  if (this.statusChart) {
    this.statusChart.destroy();
  }
  
  if (!this.stats) return;
  
  const ctx = this.statusChartRef.nativeElement.getContext('2d');
  const colors = ['#28a745', '#ffc107', '#dc3545', '#6c757d'];
  
  this.statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Paid', 'Pending', 'Overdue', 'Cancelled'],
      datasets: [{
        data: [
          this.stats.paid_payments,
          this.stats.pending_payments,
          this.stats.overdue_payments,
          this.stats.cancelled_payments || 0
        ],
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Payment Status Distribution',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          position: 'bottom',
          labels: { padding: 20 }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}


// Add method to handle view mode changes
onViewModeChange(mode: 'list' | 'cards' | 'summary'): void {
  this.viewMode = mode;
  
  if (mode === 'summary') {
    setTimeout(() => {
      this.createSummaryCharts();
    }, 100);
  }
}

// Clean up charts on destroy
ngOnDestroy(): void {
  if (this.revenueChart) {
    this.revenueChart.destroy();
  }
  if (this.statusChart) {
    this.statusChart.destroy();
  }
}
  logout(): void {
    this.authService.logout();
  }
}