import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/auth.service';
import { PersonSummary } from '@core/models/person.model';
import { AddPersonDialogComponent } from './add-person-dialog.component';

@Component({
  selector: 'mv-people',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ImageFallbackDirective
  ],
  templateUrl: './people.component.html',
  styleUrl: './people.component.scss'
})
export class PeopleComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly isAdmin = this.authService.isAdmin;
  readonly people = signal<PersonSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  searchQuery: string = '';

  readonly filteredPeople = computed<PersonSummary[]>(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.people();
    if (!q) return list;
    return list.filter(p => 
      p.fullName.toLowerCase().includes(q) || 
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadPeople();
  }

  loadPeople(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.userService.getPeopleDirectory().subscribe({
      next: (data) => {
        this.people.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load people directory:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  explorePerson(person: PersonSummary): void {
    this.router.navigate(['/timeline'], {
      queryParams: { person: person.id }
    });
  }

  openAddPersonDialog(): void {
    const dialogRef = this.dialog.open(AddPersonDialogComponent, {
      width: '480px',
      disableClose: true,
      panelClass: 'custom-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPeople();
      }
    });
  }

  getAvatarUrl(person: PersonSummary): string {
    if (person.avatarUrl && person.avatarUrl.trim()) {
      return person.avatarUrl;
    }
    const name = encodeURIComponent(person.fullName || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=f4ede4&color=92400e&font-size=0.4&bold=true`;
  }
}
