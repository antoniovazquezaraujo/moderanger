import { MusicElement, SingleNote, CompositeNote, GenericGroup, NoteDuration } from './melody';

/**
 * 🎼 Type-Safe Music Element Utilities
 * 
 * Eliminates unsafe 'any' casts and provides robust type checking
 * for music elements throughout the application.
 */

// ============= TYPE GUARDS =============

/**
 * Type guard to check if element is a SingleNote (note or rest)
 */
export function isSingleNote(element: MusicElement): element is SingleNote {
  return element.type === 'note' || element.type === 'rest';
}

/**
 * Type guard to check if element is a CompositeNote (chord or arpeggio)
 */
export function isCompositeNote(element: MusicElement): element is CompositeNote {
  return element.type === 'chord' || element.type === 'arpeggio';
}

/**
 * Type guard to check if element is a GenericGroup
 */
export function isGenericGroup(element: MusicElement): element is GenericGroup {
  return element.type === 'group';
}

/**
 * Type guard to check if element has children (group, chord, or arpeggio)
 */
export function hasChildren(element: MusicElement): element is GenericGroup | CompositeNote {
  return isGenericGroup(element) || isCompositeNote(element);
}

// ============= SAFE ACCESSORS =============

/**
 * Safely get children from any element that can have them
 */
export function getChildren(element: MusicElement): MusicElement[] {
  if (isGenericGroup(element)) {
    return element.children || [];
  }
  if (isCompositeNote(element)) {
    return element.notes || [];
  }
  return [];
}

/**
 * Safely get the value from a SingleNote
 */
export function getNoteValue(element: MusicElement): number | null | undefined {
  if (isSingleNote(element)) {
    return element.value;
  }
  return undefined;
}

/**
 * Safely get the duration from any element
 */
export function getElementDuration(element: MusicElement): NoteDuration | undefined {
  return element.duration;
}

// ============= ELEMENT OPERATIONS =============

/**
 * Create a new element with updated children (for groups and composite notes)
 */
export function withUpdatedChildren(element: MusicElement, newChildren: MusicElement[]): MusicElement {
  if (isGenericGroup(element)) {
    return { ...element, children: newChildren };
  }
  if (isCompositeNote(element)) {
    return { ...element, notes: newChildren as SingleNote[] };
  }
  return element; // No children to update
}

/**
 * Create a new SingleNote with updated value
 */
export function withUpdatedValue(element: MusicElement, newValue: number | null): MusicElement {
  if (isSingleNote(element)) {
    return { ...element, value: newValue };
  }
  return element; // Not a single note
}

/**
 * Create a new element with updated duration
 */
export function withUpdatedDuration(element: MusicElement, newDuration: NoteDuration): MusicElement {
  return { ...element, duration: newDuration };
}

// ============= RECURSIVE UTILITIES =============

/**
 * Generic recursive walker for music elements
 * Provides a type-safe way to traverse element trees
 */
export function walkElements<T>(
  elements: MusicElement[],
  visitor: (element: MusicElement, depth: number, path: string[]) => T | null,
  depth: number = 0,
  path: string[] = []
): T[] {
  const results: T[] = [];
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const currentPath = [...path, `[${i}]`];
    
    // Visit current element
    const result = visitor(element, depth, currentPath);
    if (result !== null) {
      results.push(result);
    }
    
    // Recursively visit children
    const children = getChildren(element);
    if (children.length > 0) {
      const childResults = walkElements(children, visitor, depth + 1, [...currentPath, 'children']);
      results.push(...childResults);
    }
  }
  
  return results;
}

/**
 * Find an element by ID using type-safe traversal
 */
export function findElementById(elements: MusicElement[], id: string): MusicElement | null {
  const results = walkElements(elements, (element) => {
    return element.id === id ? element : null;
  });
  
  return results[0] || null;
}

/**
 * Find element with its parent using type-safe traversal
 */
export function findElementWithParent(
  elements: MusicElement[], 
  id: string
): { element: MusicElement | null, parent: MusicElement | null, parentPath: string[] } {
  let foundElement: MusicElement | null = null;
  let foundParent: MusicElement | null = null;
  let foundParentPath: string[] = [];
  
  walkElements(elements, (element, depth, path) => {
    if (element.id === id) {
      foundElement = element;
      
      // Find parent by walking up the path
      if (path.length > 1) {
        const parentPath = path.slice(0, -2); // Remove [index] and 'children'
        const parent = findElementByPath(elements, parentPath);
        foundParent = parent;
        foundParentPath = parentPath;
      }
      
      return element; // Stop searching once found
    }
    return null;
  });
  
  return { element: foundElement, parent: foundParent, parentPath: foundParentPath };
}

/**
 * Find element by path array (for parent lookup)
 */
function findElementByPath(elements: MusicElement[], path: string[]): MusicElement | null {
  let current = elements;
  let element: MusicElement | null = null;
  
  for (const pathSegment of path) {
    if (pathSegment.startsWith('[') && pathSegment.endsWith(']')) {
      const index = parseInt(pathSegment.slice(1, -1));
      if (index >= 0 && index < current.length) {
        element = current[index];
        current = getChildren(element);
      } else {
        return null;
      }
    }
  }
  
  return element;
}

// ============= VALIDATION UTILITIES =============

/**
 * Count elements by type
 */
export interface ElementCounts {
  notes: number;
  rests: number;
  groups: number;
  chords: number;
  arpeggios: number;
  total: number;
}

export function countElementsByType(elements: MusicElement[]): ElementCounts {
  const counts: ElementCounts = {
    notes: 0,
    rests: 0,
    groups: 0,
    chords: 0,
    arpeggios: 0,
    total: 0
  };
  
  walkElements(elements, (element) => {
    counts.total++;
    switch (element.type) {
      case 'note': counts.notes++; break;
      case 'rest': counts.rests++; break;
      case 'group': counts.groups++; break;
      case 'chord': counts.chords++; break;
      case 'arpeggio': counts.arpeggios++; break;
    }
    return null; // We don't need to collect results
  });
  
  return counts;
}

/**
 * Validate element structure
 */
export interface ValidationIssue {
  elementId: string;
  path: string[];
  type: 'error' | 'warning';
  message: string;
}

export function validateElements(elements: MusicElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  walkElements(elements, (element, depth, path) => {
    // Store element ID safely
    const elementId = element?.id || 'unknown';
    
    // Check for missing ID
    if (!element.id) {
      issues.push({
        elementId: 'unknown',
        path,
        type: 'error',
        message: 'Element is missing ID'
      });
    }
    
    // Check for missing type
    if (!element.type) {
      issues.push({
        elementId,
        path,
        type: 'error',
        message: 'Element is missing type'
      });
      return null; // Skip further validation if type is missing
    }
    
    // Type-specific validations
    if (isSingleNote(element)) {
      if (element.value === undefined) {
        issues.push({
          elementId,
          path,
          type: 'warning',
          message: 'Single note has no value'
        });
      }
    }
    
    if (isGenericGroup(element)) {
      if (!element.children || element.children.length === 0) {
        issues.push({
          elementId,
          path,
          type: 'warning',
          message: 'Group has no children'
        });
      }
    }
    
    if (isCompositeNote(element)) {
      if (!element.notes || element.notes.length === 0) {
        issues.push({
          elementId,
          path,
          type: 'warning',
          message: `${element.type} has no notes`
        });
      }
    }
    
    return null;
  });
  
  return issues;
} 