import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
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
    MatMenuModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ImageFallbackDirective
  ],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss'
})
export class AdminSettingsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Invite System UI State
  readonly inviteCode = 'MV-GOA-2026';
  readonly copiedLink = signal<boolean>(false);
  readonly copiedCode = signal<boolean>(false);

  readonly adminCount = computed(() => {
    return this.users().filter(u => u.role === 'ADMIN').length;
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (list) => {
        this.users.set(list || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.isLoading.set(false);
      }
    });
  }

  copyInviteLink(): void {
    const inviteUrl = `${window.location.origin}/register?code=${this.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      this.copiedLink.set(true);
      this.snackBar.open('Invite link copied to clipboard!', 'OK', { duration: 3000 });
      setTimeout(() => this.copiedLink.set(false), 2500);
    });
  }

  copyInviteCode(): void {
    navigator.clipboard.writeText(this.inviteCode).then(() => {
      this.copiedCode.set(true);
      this.snackBar.open(`Passcode ${this.inviteCode} copied!`, 'OK', { duration: 3000 });
      setTimeout(() => this.copiedCode.set(false), 2500);
    });
  }

  promoteToAdmin(user: User): void {
    this.userService.updateUser(user.id, {
      fullName: user.fullName,
      role: 'ADMIN',
      avatarUrl: user.avatarUrl
    }).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: 'ADMIN' } : u));
        this.snackBar.open(`${user.fullName} is now an Admin.`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to promote user:', err);
        this.snackBar.open('Failed to update role. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  demoteToMember(user: User): void {
    this.userService.updateUser(user.id, {
      fullName: user.fullName,
      role: 'MEMBER',
      avatarUrl: user.avatarUrl
    }).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: 'MEMBER' } : u));
        this.snackBar.open(`${user.fullName} set as regular Member.`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to demote user:', err);
        this.snackBar.open('Failed to update role. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      data: user,
      width: '480px'
    });

    dialogRef.afterClosed().subscribe((updated: User | undefined) => {
      if (updated) {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }
}
