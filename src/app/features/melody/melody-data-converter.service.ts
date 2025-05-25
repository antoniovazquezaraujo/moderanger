import { Injectable } from '@angular/core';
import { MusicElement, NoteConverter } from '../../model/melody';
import { NoteData } from '../../model/note';

export interface ConversionOptions {
  includeMetadata?: boolean;
  preserveIds?: boolean;
  flattenGroups?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MelodyDataConverterService {

  constructor() {
    console.log('[MelodyDataConverter] Service initialized');
  }

  // ============= PUBLIC API =============

  /**
   * Convert music elements to NoteData array
   */
  toNoteData(elements: MusicElement[], options: ConversionOptions = {}): NoteData[] {
    console.log(`[MelodyDataConverter] Converting ${elements.length} elements to NoteData`);
    
    try {
      const noteDataArray: NoteData[] = [];
      
      for (const element of elements) {
        const converted = this.convertElementToNoteData(element, options);
        noteDataArray.push(...converted);
      }
      
      console.log(`[MelodyDataConverter] Converted to ${noteDataArray.length} NoteData items`);
      return noteDataArray;
      
    } catch (error) {
      console.error('[MelodyDataConverter] Error converting to NoteData:', error);
      throw error;
    }
  }

  /**
   * Convert NoteData array to music elements
   */
  fromNoteData(noteDataArray: NoteData[], options: ConversionOptions = {}): MusicElement[] {
    console.log(`[MelodyDataConverter] Converting ${noteDataArray.length} NoteData items to elements`);
    
    try {
      const elements: MusicElement[] = [];
      
      for (const noteData of noteDataArray) {
        const converted = this.convertNoteDataToElement(noteData, options);
        if (converted) {
          elements.push(converted);
        }
      }
      
      console.log(`[MelodyDataConverter] Converted to ${elements.length} elements`);
      return elements;
      
    } catch (error) {
      console.error('[MelodyDataConverter] Error converting from NoteData:', error);
      throw error;
    }
  }

  /**
   * Convert elements to JSON string
   */
  toJSON(elements: MusicElement[], options: ConversionOptions = {}): string {
    console.log(`[MelodyDataConverter] Converting ${elements.length} elements to JSON`);
    
    try {
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        elements: options.includeMetadata ? this.addMetadata(elements) : elements
      };
      
      return JSON.stringify(data, null, 2);
      
    } catch (error) {
      console.error('[MelodyDataConverter] Error converting to JSON:', error);
      throw error;
    }
  }

  /**
   * Convert JSON string to elements
   */
  fromJSON(jsonString: string, options: ConversionOptions = {}): MusicElement[] {
    console.log('[MelodyDataConverter] Converting JSON to elements');
    
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Invalid JSON format: missing or invalid elements array');
      }
      
      return this.processImportedElements(data.elements, options);
      
    } catch (error) {
      console.error('[MelodyDataConverter] Error converting from JSON:', error);
      throw error;
    }
  }

  /**
   * Flatten nested groups into a linear sequence
   */
  flatten(elements: MusicElement[]): MusicElement[] {
    console.log(`[MelodyDataConverter] Flattening ${elements.length} elements`);
    
    const flatElements: MusicElement[] = [];
    
    for (const element of elements) {
      this.flattenElementRecursively(element, flatElements);
    }
    
    console.log(`[MelodyDataConverter] Flattened to ${flatElements.length} elements`);
    return flatElements;
  }

  /**
   * Get metadata about element structure
   */
  analyzeStructure(elements: MusicElement[]): StructureAnalysis {
    console.log(`[MelodyDataConverter] Analyzing structure of ${elements.length} elements`);
    
    const analysis: StructureAnalysis = {
      totalElements: 0,
      noteCount: 0,
      restCount: 0,
      groupCount: 0,
      chordCount: 0,
      arpeggioCount: 0,
      maxNestingLevel: 0,
      averageGroupSize: 0
    };
    
    this.analyzeElementsRecursively(elements, analysis, 0);
    
    // Calculate averages
    if (analysis.groupCount > 0) {
      analysis.averageGroupSize = analysis.totalElements / analysis.groupCount;
    }
    
    console.log('[MelodyDataConverter] Structure analysis completed:', analysis);
    return analysis;
  }

  /**
   * Validate element structure
   */
  validateStructure(elements: MusicElement[]): ValidationResult {
    console.log(`[MelodyDataConverter] Validating structure of ${elements.length} elements`);
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    this.validateElementsRecursively(elements, result, []);
    
    console.log(`[MelodyDataConverter] Validation completed. Valid: ${result.isValid}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
    return result;
  }

  // ============= PRIVATE METHODS =============

  private convertElementToNoteData(element: MusicElement, options: ConversionOptions): NoteData[] {
    try {
      return NoteConverter.convertFromMusicElement(element);
    } catch (error) {
      console.warn(`[MelodyDataConverter] Error converting element ${element.id}:`, error);
      return [];
    }
  }

  private convertNoteDataToElement(noteData: NoteData, options: ConversionOptions): MusicElement | null {
    try {
      return NoteConverter.convertToMusicElement(noteData);
    } catch (error) {
      console.warn('[MelodyDataConverter] Error converting NoteData:', error);
      return null;
    }
  }

  private addMetadata(elements: MusicElement[]): any[] {
    return elements.map(element => ({
      ...element,
      metadata: {
        createdAt: new Date().toISOString(),
        elementType: element.type,
        hasChildren: this.hasChildren(element)
      }
    }));
  }

  private hasChildren(element: MusicElement): boolean {
    return element.type === 'group' || element.type === 'chord' || element.type === 'arpeggio';
  }

  private processImportedElements(elements: any[], options: ConversionOptions): MusicElement[] {
    return elements.map(element => {
      if (!options.preserveIds) {
        // Generate new IDs to avoid conflicts
        element = { ...element, id: this.generateId() };
      }
      
      // Remove metadata if present
      const { metadata, ...cleanElement } = element;
      
      return cleanElement as MusicElement;
    });
  }

  private flattenElementRecursively(element: MusicElement, result: MusicElement[]): void {
    if (element.type === 'group') {
      const group = element as any; // GenericGroup type
      if (group.children) {
        for (const child of group.children) {
          this.flattenElementRecursively(child, result);
        }
      }
    } else if (element.type === 'chord' || element.type === 'arpeggio') {
      const composite = element as any; // CompositeNote type
      if (composite.notes) {
        for (const note of composite.notes) {
          this.flattenElementRecursively(note, result);
        }
      }
    } else {
      result.push(element);
    }
  }

  private analyzeElementsRecursively(elements: MusicElement[], analysis: StructureAnalysis, nestingLevel: number): void {
    analysis.maxNestingLevel = Math.max(analysis.maxNestingLevel, nestingLevel);
    
    for (const element of elements) {
      analysis.totalElements++;
      
      switch (element.type) {
        case 'note':
          analysis.noteCount++;
          break;
        case 'rest':
          analysis.restCount++;
          break;
        case 'group':
          analysis.groupCount++;
          const group = element as any;
          if (group.children) {
            this.analyzeElementsRecursively(group.children, analysis, nestingLevel + 1);
          }
          break;
        case 'chord':
          analysis.chordCount++;
          const chord = element as any;
          if (chord.notes) {
            this.analyzeElementsRecursively(chord.notes, analysis, nestingLevel + 1);
          }
          break;
        case 'arpeggio':
          analysis.arpeggioCount++;
          const arpeggio = element as any;
          if (arpeggio.notes) {
            this.analyzeElementsRecursively(arpeggio.notes, analysis, nestingLevel + 1);
          }
          break;
      }
    }
  }

  private validateElementsRecursively(elements: MusicElement[], result: ValidationResult, path: string[]): void {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const currentPath = [...path, `[${i}]`];
      
      // Validate required properties
      if (!element.id) {
        result.errors.push(`Element at ${currentPath.join('.')} is missing id`);
        result.isValid = false;
      }
      
      if (!element.type) {
        result.errors.push(`Element at ${currentPath.join('.')} is missing type`);
        result.isValid = false;
      }
      
      // Validate type-specific properties
      this.validateElementByType(element, result, currentPath);
      
      // Validate children if present
      if (element.type === 'group') {
        const group = element as any;
        if (group.children) {
          this.validateElementsRecursively(group.children, result, [...currentPath, 'children']);
        }
      }
    }
  }

  private validateElementByType(element: MusicElement, result: ValidationResult, path: string[]): void {
    switch (element.type) {
      case 'note':
      case 'rest':
        const singleNote = element as any;
        if (singleNote.value === undefined) {
          result.warnings.push(`Single note at ${path.join('.')} has no value`);
        }
        break;
      case 'group':
        const group = element as any;
        if (!group.children || group.children.length === 0) {
          result.warnings.push(`Group at ${path.join('.')} has no children`);
        }
        break;
      case 'chord':
      case 'arpeggio':
        const composite = element as any;
        if (!composite.notes || composite.notes.length === 0) {
          result.warnings.push(`${element.type} at ${path.join('.')} has no notes`);
        }
        break;
    }
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Supporting interfaces
export interface StructureAnalysis {
  totalElements: number;
  noteCount: number;
  restCount: number;
  groupCount: number;
  chordCount: number;
  arpeggioCount: number;
  maxNestingLevel: number;
  averageGroupSize: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} 