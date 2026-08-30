import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthenticated - clear auth state and redirect to login
        authService.logout();
        if (!router.url.includes('/auth/login')) {
          router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
        }
      } else if (error.status === 403) {
        console.warn('Forbidden: User does not have required permissions for this action.');
      } else if (error.status >= 500) {
        console.error('Server error encountered:', error.message);
      }

      // Return parsed error or original error
      const apiError = error.error;
      return throwError(() => apiError || error);
    })
  );
};
