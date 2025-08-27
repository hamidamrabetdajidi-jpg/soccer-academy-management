import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, FooterComponent],
  template: `
    <div class="container-fluid">
      <div class="row">
        <!-- Sidebar -->
        <app-sidebar></app-sidebar>
        
        <!-- Main content -->
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
    <app-footer></app-footer>
  `,
  styles: [`
    main {
      padding-top: 20px;
      min-height: calc(100vh - 60px);
    }
  `]
})
export class LayoutComponent {}