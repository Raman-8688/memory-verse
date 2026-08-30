import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your network connection.';
      } else if (error.status === 401) {
        // Unauthenticated - clear auth state and redirect to login
        authService.logout();
        if (!router.url.includes('/auth/login')) {
          router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
          errorMessage = 'Your session has expired. Please sign in again.';
        } else {
          errorMessage = error.error?.message || 'Invalid email or password.';
        }
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = error.error?.message || 'The requested resource was not found.';
      } else if (error.status === 400 || error.status === 422) {
        errorMessage = error.error?.message || 'Invalid data provided. Please check your inputs.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      }

      // Don't show toast for silent background polling or unread counts if unauthorized
      const isSilentCheck = req.url.includes('/notifications/unread-count');
      if (!isSilentCheck || error.status !== 401) {
        snackBar.open(errorMessage, 'Close', {
          duration: 4500,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['mv-snackbar-error']
        });
      }

      const apiError = error.error;
      return throwError(() => apiError || error);
    })
  );
};
