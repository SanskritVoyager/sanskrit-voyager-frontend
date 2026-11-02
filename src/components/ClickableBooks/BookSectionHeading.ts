import { TextElement } from '../../types/bookTypes';

/** Reader-only headings: never turn display metadata into a source text node. */
export class BookSectionHeading {
  static fromElement(element: TextElement): { text: string; elementId: string } | undefined {
    if (element.tag !== 'div') return undefined;

    const text = element.attributes?.display_heading?.trim();
    const elementId = element.attributes?.id?.trim();
    if (!text || !elementId || /\s/.test(elementId)) return undefined;

    return { text, elementId };
  }
}
