import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../app.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../app.component.ts'), 'utf8');
const index = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

describe('App shell · theme selector', () => {
    it('ofrece un botón accesible para alternar el tema', () => {
        expect(template).toContain('class="theme-toggle"');
        expect(template).toContain('(click)="toggleTheme()"');
        expect(template).toContain('Switch to light theme');
        expect(template).toContain('Switch to dark theme');
        expect(template).toContain("theme === 'dark' ? 'pi-sun' : 'pi-moon'");
    });

    it('el componente usa ThemeService y expone theme$', () => {
        expect(component).toContain('ThemeService');
        expect(component).toContain('public theme$: Observable<Theme>');
        expect(component).toContain('this.themeService.toggle()');
    });

    it('el tema se aplica antes del primer pintado', () => {
        expect(index).toContain("localStorage.getItem(key)");
        expect(index).toContain("document.documentElement.setAttribute('data-theme', theme)");
        expect(index).toContain("prefers-color-scheme: dark");
    });
});
