import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notifications.asObservable();

  show(type: Notification['type'], message: string, timeout = 5000): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      message,
      timeout
    };

    const current = this.notifications.value;
    this.notifications.next([...current, notification]);

    if (timeout > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, timeout);
    }
  }

  success(message: string, timeout?: number): void {
    this.show('success', message, timeout);
  }

  error(message: string, timeout?: number): void {
    this.show('error', message, timeout);
  }

  warning(message: string, timeout?: number): void {
    this.show('warning', message, timeout);
  }

  info(message: string, timeout?: number): void {
    this.show('info', message, timeout);
  }

  remove(id: string): void {
    const current = this.notifications.value;
    this.notifications.next(current.filter(n => n.id !== id));
  }

  clear(): void {
    this.notifications.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}