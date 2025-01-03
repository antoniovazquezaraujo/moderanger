import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { VariableContext, VariableValue } from '../../model/variable.context';

interface VariableDeclaration {
  name: string;
  value: VariableValue;
}

@Component({
  selector: 'app-variable-declaration',
  templateUrl: './variable-declaration.component.html',
  styleUrls: ['./variable-declaration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariableDeclarationComponent implements OnInit, OnChanges {
  @Input() variableContext!: VariableContext;
  
  variables: VariableDeclaration[] = [];
  newVariable: VariableDeclaration = { name: '', value: '' };
  private _initialized = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this._initialized = true;
    setTimeout(() => {
      this.loadVariables();
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this._initialized && changes['variableContext']) {
      setTimeout(() => {
        this.loadVariables();
        this.cdr.detectChanges();
      });
    }
  }

  private loadVariables(): void {
    if (!this.variableContext) return;
    
    const variables = this.variableContext.getAllVariables();
    this.variables = Array.from(variables.entries()).map(([name, value]) => ({ name, value }));
  }

  addVariable(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.newVariable.name && this.newVariable.value !== undefined) {
      this.variableContext.setValue(this.newVariable.name, this.newVariable.value);
      this.variables = [...this.variables, { ...this.newVariable }];
      this.newVariable = { name: '', value: '' };
      setTimeout(() => {
        this.cdr.detectChanges();
      });
    }
  }

  removeVariable(index: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const variable = this.variables[index];
    if (variable) {
      this.variableContext.removeVariable(variable.name);
      this.variables = this.variables.filter((_, i) => i !== index);
      setTimeout(() => {
        this.cdr.detectChanges();
      });
    }
  }

  updateVariable(index: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const variable = this.variables[index];
    if (variable) {
      this.variableContext.setValue(variable.name, variable.value);
      this.variables = [...this.variables];
      setTimeout(() => {
        this.cdr.detectChanges();
      });
    }
  }
} 