import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export interface ComponentCanDeactivate {
  canDeactivate(): boolean | Observable<boolean>;
  hasUnsavedChanges(): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<ComponentCanDeactivate> {

  canDeactivate(component: ComponentCanDeactivate): boolean | Observable<boolean> {
    if (component.hasUnsavedChanges && component.hasUnsavedChanges()) {
      const message = '¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.';
      return confirm(message);
    }
    return true;
  }
} 