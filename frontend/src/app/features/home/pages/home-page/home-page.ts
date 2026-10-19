import { ChangeDetectionStrategy, Component, inject, signal, type OnInit } from '@angular/core';
import type { Nursery } from '../../models/nursery.model';
import { NurseryService } from '../../services/nursery.service';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private readonly nurseryService = inject(NurseryService);

  protected readonly nursery = signal<Nursery | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.nurseryService.getCurrent().subscribe({
      next: (nursery) => {
        this.nursery.set(nursery);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
