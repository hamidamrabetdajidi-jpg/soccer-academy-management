import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer mt-auto py-3 bg-dark text-white">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-6">
            <span class="text-muted">
              © {{ currentYear }} Soccer Academy Management System
            </span>
          </div>
          <div class="col-md-6 text-end">
            <span class="text-muted">
              Version 1.0.0 | 
              <a href="#" class="text-muted text-decoration-none">Support</a> | 
              <a href="#" class="text-muted text-decoration-none">Documentation</a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      position: relative;
      bottom: 0;
      width: 100%;
      background-color: #2c5530 !important;
      box-shadow: 0 -1px 5px rgba(0,0,0,0.1);
    }

    .footer a:hover {
      color: #5cb85c !important;
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}