import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '@core/models/user.model';
import { UserService } from '@core/services/user.service';
import { UserEditDialogComponent } from './user-edit-dialog.component';

@Component({
  selector: 'mv-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="admin-page">
      <!-- Header -->
      <header class="admin-header">
        <div class="header-info">
          <span class="sub-label">Administration</span>
          <h1 class="editorial-title">Group Directory & Access</h1>
          <p class="header-desc">
            Manage your inner circle, promote fellow administrators, and maintain group membership.
          </p>
        </div>

        <!-- Metric Ribbon -->
        <div class="stats-ribbon">
          <div class="stat-bubble">
            <mat-icon>groups</mat-icon>
            <div>
              <span class="stat-val">{{ users().length }}</span>
              <span class="stat-lbl">Members</span>
            </div>
          </div>
          <div class="stat-bubble admin">
            <mat-icon>shield</mat-icon>
            <div>
              <span class="stat-val">{{ adminCount() }}</span>
              <span class="stat-lbl">Admins</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Content -->
      @if (isLoading()) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Retrieving member roster...</span>
        </div>
      } @else {
        <div class="members-grid">
          @for (user of users(); track user.id) {
            <article class="member-card interactive-card">
              <!-- Avatar & Status -->
              <div class="member-avatar-wrap">
                <img [src]="user.avatarUrl || defaultAvatar" 
                     [alt]="user.fullName" 
                     (error)="onImgError($event)" 
                     class="member-avatar" />
                <span class="role-badge" [class.admin]="user.role === 'ADMIN'">
                  {{ user.role }}
                </span>
              </div>

              <!-- Info -->
              <div class="member-details">
                <h3 class="member-name">{{ user.fullName }}</h3>
                <span class="member-email">{{ user.email }}</span>
                <span class="member-joined">Member since {{ formatDate(user.createdAt) }}</span>
              </div>

              <!-- Actions -->
              <div class="member-actions">
                <button mat-stroked-button class="edit-btn" (click)="openEditDialog(user)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit Profile</span>
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding-bottom: var(--space-8);
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--mv-border);
      flex-wrap: wrap;
      gap: var(--space-4);
    }

    .sub-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--mv-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .editorial-title {
      font-size: 2.2rem;
      margin: 2px 0 6px 0;
    }

    .header-desc {
      color: var(--mv-text-secondary);
      font-size: 0.92rem;
      margin: 0;
      max-width: 600px;
    }

    .stats-ribbon {
      display: flex;
      gap: 12px;
    }

    .stat-bubble {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      padding: 8px 16px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .stat-bubble mat-icon {
      color: var(--mv-text-muted);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stat-bubble.admin mat-icon {
      color: var(--mv-primary);
    }

    .stat-val {
      font-weight: 700;
      font-size: 1.1rem;
      display: block;
      color: var(--mv-text-primary);
      line-height: 1.2;
    }

    .stat-lbl {
      font-size: 0.72rem;
      color: var(--mv-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4);
    }

    .member-card {
      background-color: var(--mv-bg-surface);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      box-shadow: var(--shadow-card);
      position: relative;
    }

    .member-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .member-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--mv-border);
    }

    .role-badge {
      position: absolute;
      bottom: -2px;
      right: -4px;
      background: #78716c;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .role-badge.admin {
      background: var(--mv-primary);
    }

    .member-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .member-name {
      font-family: var(--font-editorial);
      font-size: 1.15rem;
      margin: 0;
      color: var(--mv-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .member-email {
      font-size: 0.82rem;
      color: var(--mv-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .member-joined {
      font-size: 0.74rem;
      color: var(--mv-text-muted);
      margin-top: 4px;
    }

    .member-actions {
      flex-shrink: 0;
    }

    .edit-btn {
      font-size: 0.82rem !important;
      color: var(--mv-primary) !important;
      border-color: var(--mv-border) !important;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 10px !important;
      height: 36px;
      border-radius: var(--radius-md) !important;
    }

    .loading-state {
      padding: var(--space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: var(--mv-bg-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--mv-border);
    }

    @media (max-width: 640px) {
      .member-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .member-actions {
        width: 100%;
        margin-top: 8px;
        .edit-btn {
          width: 100%;
          justify-content: center;
        }
      }
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  readonly adminCount = computed(() =>
    this.users().filter(u => u.role === 'ADMIN').length
  );

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load group users:', err);
        this.isLoading.set(false);
      }
    });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      data: user,
      width: '480px',
      panelClass: 'editorial-dialog'
    });

    dialogRef.afterClosed().subscribe((updated: User | undefined) => {
      if (updated) {
        this.users.update(list =>
          list.map(u => u.id === updated.id ? updated : u)
        );
      }
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }
}
