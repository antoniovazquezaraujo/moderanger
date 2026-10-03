import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  applyDocumentVariables,
  createDocumentFromContext,
  MR_FORMAT_VERSION,
  MrMeta,
  MrParseError,
  MrSerializeError,
  positionToOffset,
  serializeSong,
  validateSongText
} from 'src/app/model/mr';
import { Song } from 'src/app/model/song';

/** Resultado de aplicar la vista de texto al modelo de la app. */
export interface MrTextAppliedEvent {
  /** Nueva canción parseada (instancia nueva; sustituye a la anterior). */
  song: Song;
  /** Metadatos del texto aplicado (`repeats`, `bpm`, versión). */
  meta: MrMeta;
}

/**
 * Vista de texto `.mr` (Fase 2 del ADR-001), accesible desde el editor de
 * canción. Muestra el texto canónico del modelo, permite editarlo, valida con
 * errores de línea/columna y lo aplica de vuelta (botón "Aplicar").
 *
 * La GUI de componentes sigue siendo la vista principal: esto es una variante
 * avanzada con divulgación progresiva. El componente no toca `SongPlayer` ni
 * `GlobalStateService`: emite `applied` y el padre decide cómo integrarlo.
 */
@Component({
  selector: 'app-mr-text-editor',
  templateUrl: './mr-text-editor.component.html',
  styleUrls: ['./mr-text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MrTextEditorComponent implements OnChanges, OnDestroy {
  @Input() song!: Song;
  @Input() visible = false;
  /** Repeticiones actuales del editor (campo "Repeat"); se escriben como `repeats`. */
  @Input() repeats = 1;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() applied = new EventEmitter<MrTextAppliedEvent>();

  @ViewChild('editor') editorRef?: ElementRef<HTMLTextAreaElement>;

  /** Texto editable actualmente en el textarea. */
  text = '';
  /** Último texto sincronizado con el modelo (para saber si hay cambios). */
  baseline = '';
  errors: MrParseError[] = [];
  /** Error de serialización del modelo (la GUI puede tener notas inválidas). */
  serializeError: string | null = null;

  /** BPM aplicado en esta sesión de vista (el modelo no guarda bpm todavía). */
  private bpm: number | undefined;
  private readonly validateInput$ = new Subject<void>();
  private readonly subscriptions = new Subscription();

  constructor(private readonly cdr: ChangeDetectorRef) {
    this.subscriptions.add(
      this.validateInput$.pipe(debounceTime(200)).subscribe(() => {
        this.errors = validateSongText(this.text).errors;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.reloadIfClean();
    }
    if (changes['repeats'] !== undefined && !changes['repeats'].firstChange) {
      this.reloadIfClean();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get dirty(): boolean {
    return this.text !== this.baseline;
  }

  get canApply(): boolean {
    return this.dirty && this.errors.length === 0 && this.serializeError === null;
  }

  get canRevert(): boolean {
    return this.dirty;
  }

  get statusLabel(): string {
    if (this.serializeError !== null) {
      return 'No se puede serializar el modelo';
    }
    if (this.errors.length > 0) {
      const first = this.errors[0];
      return `${this.errors.length} error(es) · línea ${first.line}, columna ${first.column}`;
    }
    return this.dirty ? 'Cambios sin aplicar' : 'Sin cambios';
  }

  get statusIcon(): string {
    if (this.serializeError !== null || this.errors.length > 0) {
      return 'pi pi-times-circle';
    }
    return this.dirty ? 'pi pi-exclamation-circle' : 'pi pi-check-circle';
  }

  onTextChange(value: string): void {
    this.text = value;
    this.serializeError = null;
    this.validateInput$.next();
  }

  onDialogVisibleChange(visible: boolean): void {
    this.visibleChange.emit(visible);
  }

  validateNow(): void {
    this.errors = validateSongText(this.text).errors;
    this.serializeError = null;
    this.cdr.markForCheck();
  }

  /** Parseo + reemplazo del modelo y de las variables declaradas. */
  apply(): void {
    const result = validateSongText(this.text);
    this.errors = result.errors;
    const document = result.document;
    if (document === undefined) {
      return;
    }
    applyDocumentVariables(document);
    const canonical = serializeSong(document);
    this.bpm = document.meta.bpm;
    this.text = canonical;
    this.baseline = canonical;
    this.serializeError = null;
    this.applied.emit({ song: document.song, meta: document.meta });
  }

  /** Recarga el texto desde el modelo actual de la app. */
  revert(): void {
    this.loadFromModel();
  }

  /** Selecciona en el textarea la posición del error. */
  focusError(error: MrParseError): void {
    const textarea = this.editorRef?.nativeElement;
    if (textarea === undefined) {
      return;
    }
    const offset = positionToOffset(this.text, error.position);
    textarea.focus();
    textarea.setSelectionRange(offset, offset);
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight);
    if (!Number.isNaN(lineHeight) && lineHeight > 0) {
      textarea.scrollTop = Math.max(0, (error.line - 2) * lineHeight);
    }
  }

  private reloadIfClean(): void {
    if (this.dirty) {
      // No se pisan ediciones sin aplicar; el usuario puede pulsar "Revertir".
      return;
    }
    this.loadFromModel();
  }

  private loadFromModel(): void {
    try {
      const document = createDocumentFromContext(this.song, this.currentMeta());
      const canonical = serializeSong(document);
      this.text = canonical;
      this.baseline = canonical;
      this.errors = [];
      this.serializeError = null;
    } catch (error) {
      this.errors = [];
      this.serializeError = error instanceof MrSerializeError ? error.message : String(error);
    }
    this.cdr.markForCheck();
  }

  private currentMeta(): MrMeta {
    return {
      version: MR_FORMAT_VERSION,
      repeats: this.repeats > 1 ? this.repeats : undefined,
      bpm: this.bpm
    };
  }
}
