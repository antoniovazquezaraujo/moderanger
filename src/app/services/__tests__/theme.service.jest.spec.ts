import { ThemeService } from '../theme.service';

interface FakeDocument {
    documentElement: {
        attributes: Record<string, string>;
        getAttribute(name: string): string | null;
        setAttribute(name: string, value: string): void;
        style: { colorScheme?: string };
    };
    defaultView: {
        localStorage: {
            values: Record<string, string>;
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
        };
        matchMedia(query: string): { matches: boolean };
    };
}

function fakeDocument(options: {
    markupTheme?: string;
    storedTheme?: string;
    prefersDark?: boolean;
} = {}): FakeDocument {
    const attributes: Record<string, string> = {};
    if (options.markupTheme) {
        attributes['data-theme'] = options.markupTheme;
    }
    const values: Record<string, string> = {};
    if (options.storedTheme) {
        values['moderanger-theme'] = options.storedTheme;
    }

    return {
        documentElement: {
            attributes,
            getAttribute(name: string): string | null {
                return attributes[name] ?? null;
            },
            setAttribute(name: string, value: string): void {
                attributes[name] = value;
            },
            style: {}
        },
        defaultView: {
            localStorage: {
                values,
                getItem(key: string): string | null {
                    return values[key] ?? null;
                },
                setItem(key: string, value: string): void {
                    values[key] = value;
                }
            },
            matchMedia(): { matches: boolean } {
                return { matches: options.prefersDark ?? false };
            }
        }
    };
}

const setGlobalDocument = (documentRef: FakeDocument | undefined): void => {
    (global as unknown as { document?: FakeDocument }).document = documentRef;
};

describe('ThemeService', () => {
    afterEach(() => {
        setGlobalDocument(undefined);
    });

    it('respeta el tema aplicado por el script inicial', () => {
        const documentRef = fakeDocument({ markupTheme: 'dark', storedTheme: 'light' });
        setGlobalDocument(documentRef);

        const service = new ThemeService();

        expect(service.current).toBe('dark');
        expect(documentRef.documentElement.style.colorScheme).toBe('dark');
    });

    it('usa el tema guardado y, si no hay, la preferencia del sistema', () => {
        const stored = fakeDocument({ storedTheme: 'dark' });
        setGlobalDocument(stored);
        expect(new ThemeService().current).toBe('dark');

        const system = fakeDocument({ prefersDark: true });
        setGlobalDocument(system);
        expect(new ThemeService().current).toBe('dark');
    });

    it('alterna, persiste y notifica a los suscriptores', () => {
        const documentRef = fakeDocument({ markupTheme: 'light' });
        setGlobalDocument(documentRef);
        const service = new ThemeService();
        const themes: string[] = [];
        service.theme$.subscribe(theme => themes.push(theme));

        service.toggle();

        expect(service.current).toBe('dark');
        expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(documentRef.defaultView.localStorage.values['moderanger-theme']).toBe('dark');
        expect(themes).toEqual(['light', 'dark']);
    });

    it('funciona sin document (SSR/tests) sin romper', () => {
        setGlobalDocument(undefined);

        const service = new ThemeService();

        expect(service.current).toBe('light');
        expect(() => service.toggle()).not.toThrow();
        expect(service.current).toBe('dark');
    });
});
