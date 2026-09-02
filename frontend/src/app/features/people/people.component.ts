import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import { MemoryService } from '@core/services/memory.service';
import { AuthService } from '@core/auth/auth.service';
import { User } from '@core/models/user.model';
import { Memory } from '@core/models/memory.model';

export interface PersonCard {
  id: string;
  fullName: string;
  avatarUrl?: string;
  role?: string;
  memoryCount: number;
  latestMemoryTitle?: string;
}

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
    ImageFallbackDirective
  ],
  templateUrl: './people.component.html',
  styleUrl: './people.component.scss'
})
export class PeopleComponent implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly people = signal<PersonCard[]>([]);
  readonly isLoading = signal<boolean>(true);
  searchQuery: string = '';

  readonly filteredPeople = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.people();
    if (!q) return list;
    return list.filter(p => p.fullName.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadPeople();
  }

  loadPeople(): void {
    this.isLoading.set(true);

    this.memoryService.getMemories({ size: 100 }).subscribe({
      next: (res) => {
        const memories = res.content || [];
        const personMap = new Map<string, { user: User; memories: Memory[] }>();

        // Always include current logged in user
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          personMap.set(currentUser.id, { user: currentUser, memories: [] });
        }

        // Aggregate authors and tagged users
        memories.forEach(m => {
          if (m.createdBy) {
            if (!personMap.has(m.createdBy.id)) {
              personMap.set(m.createdBy.id, { user: m.createdBy, memories: [] });
            }
            personMap.get(m.createdBy.id)!.memories.push(m);
          }

          if (m.taggedUsers && m.taggedUsers.length > 0) {
            m.taggedUsers.forEach(tagged => {
              if (!personMap.has(tagged.id)) {
                personMap.set(tagged.id, { user: tagged, memories: [] });
              }
              const group = personMap.get(tagged.id)!;
              if (!group.memories.some(existing => existing.id === m.id)) {
                group.memories.push(m);
              }
            });
          }
        });

        const list: PersonCard[] = Array.from(personMap.values()).map(({ user, memories: userMemories }) => {
          userMemories.sort((a, b) => new Date(b.memoryDate || b.createdAt).getTime() - new Date(a.memoryDate || a.createdAt).getTime());
          const latest = userMemories[0];

          return {
            id: user.id,
            fullName: user.fullName || 'Member',
            avatarUrl: user.avatarUrl,
            role: user.role,
            memoryCount: userMemories.length,
            latestMemoryTitle: latest?.title
          };
        });

        // Sort by memory count descending
        list.sort((a, b) => b.memoryCount - a.memoryCount);
        this.people.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load people directory:', err);
        this.isLoading.set(false);
      }
    });
  }

  explorePerson(name: string): void {
    this.router.navigate(['/memories'], { queryParams: { keyword: name } });
  }
}
