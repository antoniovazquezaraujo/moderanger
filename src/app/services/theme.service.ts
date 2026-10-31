import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'moderanger-theme';

interface ThemeDocument {
    documentElement: {
        getAttribute(name: string): string | null;
        setAttribute(name: string, value: string): void;
        style: { colorScheme?: string };
    };
    defaultView?: {
        localStorage?: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
        };
        matchMedia?: (query: string) => { matches: boolean };
    } | null;
}

/**
 * App-wide light/dark theme with localStorage persistence.
 *
 * The initial theme is also applied by a tiny inline script in index.html so
 * the first paint does not flash the wrong palette before Angular boots.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly subject: BehaviorSubject<Theme>;
    readonly theme$: Observable<Theme>;

    constructor() {
        const documentRef = this.document;
        const initial = this.readInitialTheme(documentRef);
        this.subject = new BehaviorSubject<Theme>(initial);
        this.theme$ = this.subject.asObservable();
        this.apply(initial, documentRef);
    }

    get current(): Theme {
        return this.subject.value;
    }

    toggle(): void {
        this.set(this.current === 'dark' ? 'light' : 'dark');
    }

    set(theme: Theme): void {
        const documentRef = this.document;
        this.apply(theme, documentRef);
        try {
            documentRef?.defaultView?.localStorage?.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // Private mode or storage disabled: the theme still applies for this session.
        }
        this.subject.next(theme);
    }

    private get document(): ThemeDocument | null {
        return typeof document === 'undefined' ? null : document as unknown as ThemeDocument;
    }

    private readInitialTheme(documentRef: ThemeDocument | null): Theme {
        const fromMarkup = documentRef?.documentElement.getAttribute('data-theme');
        if (fromMarkup === 'light' || fromMarkup === 'dark') {
            return fromMarkup;
        }

        try {
            const stored = documentRef?.defaultView?.localStorage?.getItem(THEME_STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
        } catch {
            // Ignore storage access failures.
        }

        try {
            return documentRef?.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
        } catch {
            return 'light';
        }
    }

    private apply(theme: Theme, documentRef: ThemeDocument | null): void {
        if (!documentRef) {
            return;
        }
        documentRef.documentElement.setAttribute('data-theme', theme);
        documentRef.documentElement.style.colorScheme = theme;
    }
}
