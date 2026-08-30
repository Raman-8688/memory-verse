import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'mv-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-wrapper">
      <!-- Left Editorial Storytelling Visual -->
      <div class="login-hero">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-badge">MemoryVerse</div>
          <h1 class="hero-title">Our Journey.<br>Our Memories.</h1>
          <p class="hero-subtitle">
            "We didn't realize we were making memories, we just knew we were having fun."
          </p>
          <div class="hero-timeline-indicator">
            <span class="dot"></span>
            <span class="label">B.Tech 2018 — Present & Forever</span>
          </div>
        </div>
      </div>

      <!-- Right Authentication Form -->
      <div class="login-form-pane">
        <div class="form-card">
          <div class="brand-header">
            <div class="brand-sub">Welcome Back</div>
            <h2 class="editorial-title">Sign in to your journey</h2>
            <p class="form-desc">Enter your credentials to access your private shared moments.</p>
          </div>

          @if (errorMessage()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email Address</mat-label>
              <input matInput formControlName="email" type="email" placeholder="friend@memoryverse.com" autocomplete="email">
              <mat-icon matPrefix class="form-prefix-icon">email</mat-icon>
              @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                <mat-error>Enter a valid email address</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword() ? 'password' : 'text'" autocomplete="current-password">
              <mat-icon matPrefix class="form-prefix-icon">lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())" [attr.aria-label]="'Hide password'">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button class="submit-btn" type="submit" [disabled]="loginForm.invalid || isLoading()">
              @if (isLoading()) {
                <ng-container>
                  <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
                  <span>Entering MemoryVerse...</span>
                </ng-container>
              } @else {
                <ng-container>
                  <span>Sign In to MemoryVerse</span>
                  <mat-icon>arrow_forward</mat-icon>
                </ng-container>
              }
            </button>
          </form>

          <!-- One-Click Demo Credential Helpers -->
          <div class="demo-helpers">
            <span class="demo-label">Quick Sign-in (Demo Accounts):</span>
            <div class="demo-buttons">
              <button type="button" class="demo-chip" (click)="fillCredentials('admin@memoryverse.com', 'password123')">
                <mat-icon>admin_panel_settings</mat-icon>
                <span>Admin (Arjun)</span>
              </button>
              <button type="button" class="demo-chip" (click)="fillCredentials('ravi@memoryverse.com', 'password123')">
                <mat-icon>person</mat-icon>
                <span>Member (Ravi)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      min-height: 100vh;
      width: 100%;
      background-color: var(--mv-bg-main);
    }

    .login-hero {
      flex: 1.2;
      position: relative;
      background-image: url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80');
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: var(--space-8);
      color: #ffffff;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(28, 25, 23, 0.2) 0%, rgba(28, 25, 23, 0.85) 100%);
    }

    .hero-content {
      position: relative;
      z-index: 10;
      max-width: 600px;
    }

    .hero-badge {
      display: inline-block;
      padding: 6px 14px;
      background-color: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: var(--space-3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .hero-title {
      font-family: var(--font-editorial);
      font-size: 3.5rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: var(--space-2);
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-family: var(--font-editorial);
      font-size: 1.35rem;
      font-style: italic;
      line-height: 1.5;
      color: #e7e5e4;
      margin-bottom: var(--space-4);
    }

    .hero-timeline-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      color: #d6d3d1;
      font-weight: 500;
    }

    .hero-timeline-indicator .dot {
      width: 8px;
      height: 8px;
      background-color: var(--mv-primary);
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(180, 83, 9, 0.4);
    }

    .login-form-pane {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
    }

    .form-card {
      width: 100%;
      max-width: 440px;
      background-color: var(--mv-bg-surface);
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      border: 1px solid var(--mv-border);
      box-shadow: var(--shadow-card);
    }

    .brand-sub {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mv-primary);
      margin-bottom: 4px;
    }

    .editorial-title {
      font-size: 2rem;
      margin: 0 0 8px 0;
    }

    .form-desc {
      color: var(--mv-text-secondary);
      font-size: 0.9rem;
      margin-bottom: var(--space-4);
      line-height: 1.5;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: var(--mv-danger);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-bottom: var(--space-3);
      font-size: 0.875rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .full-width {
      width: 100%;
    }

    .form-prefix-icon {
      color: var(--mv-text-muted);
      margin-right: 8px;
    }

    .submit-btn {
      height: 48px;
      background-color: var(--mv-primary) !important;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 0.95rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background-color 0.2s ease;
      cursor: pointer;
    }

    .submit-btn:hover {
      background-color: var(--mv-primary-hover) !important;
    }

    .btn-spinner {
      margin-right: 8px;
    }

    .demo-helpers {
      margin-top: var(--space-4);
      padding-top: var(--space-3);
      border-top: 1px dashed var(--mv-border);
    }

    .demo-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mv-text-muted);
      display: block;
      margin-bottom: 10px;
    }

    .demo-buttons {
      display: flex;
      gap: 10px;
    }

    .demo-chip {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      background-color: var(--mv-bg-subtle);
      border: 1px solid var(--mv-border);
      border-radius: var(--radius-sm);
      color: var(--mv-text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .demo-chip:hover {
      background-color: #fef3c7;
      border-color: var(--mv-primary);
      color: var(--mv-primary);
    }

    .demo-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    @media (max-width: 900px) {
      .login-hero {
        display: none;
      }
      .login-form-pane {
        padding: var(--space-2);
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly hidePassword = signal<boolean>(true);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  fillCredentials(email: string, pass: string): void {
    this.loginForm.patchValue({ email, password: pass });
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/journeys';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.message || 'Invalid email or password. Please try again.');
      }
    });
  }
}
