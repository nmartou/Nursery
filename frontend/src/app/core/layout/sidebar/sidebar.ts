import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAVIGATION_ITEMS } from '../../constants/navigation.constants';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly items = NAVIGATION_ITEMS;
  protected readonly collapsed = signal(false);

  protected toggle(): void {
    this.collapsed.update((collapsed) => !collapsed);
  }
}
