import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Contextual guide for first-time users.
 *
 * The panel stays presentational: opening/closing is owned by the song editor,
 * and loading the example song is delegated upwards so this component does not
 * touch the model or the player.
 */
@Component({
    selector: 'app-help-panel',
    templateUrl: './help-panel.component.html',
    styleUrls: ['./help-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPanelComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() loadDemo = new EventEmitter<void>();

    close(): void {
        this.visibleChange.emit(false);
    }

    onVisibleChange(visible: boolean): void {
        this.visibleChange.emit(visible);
    }

    requestDemo(): void {
        this.loadDemo.emit();
        this.close();
    }
}
