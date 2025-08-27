import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { RevenueService, RevenueData, DashboardMetrics } from '../../services/revenue.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent  } from '../Shared/footer/footer.component';
Chart.register(...registerables);

@Component({
  selector: 'app-revenue-overview',
  standalone: true,
  imports: [CommonModule, RouterModule,SidebarComponent,FooterComponent],
  templateUrl: './revenue-overview.html',
  styleUrls: ['./revenue-overview.scss']
})
export class RevenueOverviewComponent implements OnInit {
 @ViewChild('monthlyChart', { static: true }) monthlyChartRef!: ElementRef;
  @ViewChild('categoryChart', { static: true }) categoryChartRef!: ElementRef;
  @ViewChild('methodChart', { static: true }) methodChartRef!: ElementRef;
  @ViewChild('overdueChart', { static: true }) overdueChartRef!: ElementRef;
  Math = Math;

  revenueData: RevenueData | null = null;
  dashboardMetrics: DashboardMetrics | null = null;


  
  isLoading = false;
  error = '';
  
  // Charts
  monthlyChart: Chart | null = null;
  categoryChart: Chart | null = null;
  methodChart: Chart | null = null;
  overdueChart: Chart | null = null;

  constructor(
    private revenueService: RevenueService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadRevenueData();
    this.loadDashboardMetrics();
  }

  loadRevenueData(): void {
    this.isLoading = true;
    this.revenueService.getRevenueData().subscribe({
      next: (data) => {
        this.revenueData = data;
        this.createCharts();
        this.isLoading = false;
        console.log('📊 Revenue data loaded:', data);
      },
      error: (error) => {
        this.error = 'Failed to load revenue data';
        this.isLoading = false;
        console.error('❌ Revenue data error:', error);
      }
    });
  }

  loadDashboardMetrics(): void {
    this.revenueService.getDashboardMetrics().subscribe({
      next: (metrics) => {
        this.dashboardMetrics = metrics;
        console.log('📊 Dashboard metrics loaded:', metrics);
      },
      error: (error) => {
        console.error('❌ Dashboard metrics error:', error);
      }
    });
  }

  createCharts(): void {
    if (!this.revenueData) return;

    // Destroy existing charts
    this.destroyCharts();

    // Create monthly revenue chart
    this.createMonthlyRevenueChart();
    
    // Create category breakdown chart
    this.createCategoryChart();
    
    // Create payment method chart
    this.createPaymentMethodChart();
    
    // Create overdue analysis chart
    this.createOverdueChart();
  }

  createMonthlyRevenueChart(): void {
    if (!this.revenueData) return;

    const ctx = this.monthlyChartRef.nativeElement.getContext('2d');
    this.monthlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.revenueData.monthly_labels,
        datasets: [{
          label: 'Monthly Revenue',
          data: this.revenueData.monthly_revenue,
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
            text: 'Monthly Revenue Trend',
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
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        }
      }
    });
  }

  createCategoryChart(): void {
    if (!this.revenueData) return;

    const ctx = this.categoryChartRef.nativeElement.getContext('2d');
    const colors = ['#28a745', '#007bff', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];
    
    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.revenueData.category_breakdown.map(c => c.category),
        datasets: [{
          data: this.revenueData.category_breakdown.map(c => c.amount),
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
            text: 'Revenue by Category',
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
                const value = '$' + context.parsed.toLocaleString();
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  createPaymentMethodChart(): void {
    if (!this.revenueData) return;

    const ctx = this.methodChartRef.nativeElement.getContext('2d');
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'];
    
    this.methodChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.revenueData.payment_methods.map(m => m.method),
        datasets: [{
          label: 'Revenue',
          data: this.revenueData.payment_methods.map(m => m.amount),
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Revenue by Payment Method',
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

  createOverdueChart(): void {
    if (!this.revenueData || this.revenueData.overdue_analysis.length === 0) return;

    const ctx = this.overdueChartRef.nativeElement.getContext('2d');
    const colors = ['#ffc107', '#fd7e14', '#dc3545', '#6f42c1'];
    
    this.overdueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.revenueData.overdue_analysis.map(o => o.days_range),
        datasets: [{
          label: 'Overdue Amount',
          data: this.revenueData.overdue_analysis.map(o => o.amount),
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Overdue Payments Analysis',
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

  destroyCharts(): void {
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
      this.monthlyChart = null;
    }
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }
    if (this.methodChart) {
      this.methodChart.destroy();
      this.methodChart = null;
    }
    if (this.overdueChart) {
      this.overdueChart.destroy();
      this.overdueChart = null;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  formatPercentage(value: number): string {
    return (value || 0).toFixed(1) + '%';
  }

  refreshData(): void {
    this.loadRevenueData();
    this.loadDashboardMetrics();
  }

  exportData(): void {
    // TODO: Implement data export functionality
    console.log('📊 Exporting revenue data...');
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }
}