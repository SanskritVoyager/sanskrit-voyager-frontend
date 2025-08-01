import { TextElement } from '../types/bookTypes';

/**
 * Utility for calculating more accurate height estimates for text elements
 */
export class TextHeightCalculator {
  // Average character width in pixels (for a typical font)
  private static readonly CHAR_WIDTH = 8;

  // Line height in pixels
  private static readonly LINE_HEIGHT = 24;

  // Average container padding/margin in pixels
  private static readonly CONTAINER_PADDING = 16;

  // Additional height for translation
  private static readonly TRANSLATION_EXTRA = 10;

  // Container width (can be adjusted based on viewport)
  private containerWidth: number;

  constructor(containerWidth: number = 800) {
    this.containerWidth = containerWidth;
  }

  /**
   * Update the container width (useful when window resizes)
   */
  public setContainerWidth(width: number): void {
    this.containerWidth = width;
  }

  /**
   * Calculate the estimated height of a text element
   */
  public calculateElementHeight(element: TextElement): number {
    let totalHeight = TextHeightCalculator.CONTAINER_PADDING;

    // Calculate height for original text
    if (element.text) {
      totalHeight += this.calculateTextHeight(element.text);
    }

    // Calculate height for translated text
    if (element.translated_text) {
      totalHeight +=
        this.calculateTextHeight(element.translated_text) + TextHeightCalculator.TRANSLATION_EXTRA;
    }

    // Ensure a minimum height
    return Math.max(40, totalHeight);
  }

  /**
   * Calculate the height needed for a specific text
   */
  private calculateTextHeight(text: string): number {
    // Count the explicit line breaks (pipe characters and newlines)
    const explicitLineBreaks = (text.match(/\||\n/g) || []).length;

    // Estimate natural line breaks based on text length and container width
    const charsPerLine = this.containerWidth / TextHeightCalculator.CHAR_WIDTH;
    const naturalLineBreaks = Math.ceil(text.length / charsPerLine);

    // Total lines is the sum of explicit and natural breaks
    const totalLines = Math.max(explicitLineBreaks + 1, naturalLineBreaks);

    return totalLines * TextHeightCalculator.LINE_HEIGHT;
  }

  /**
   * Process a collection of elements and return an array of height estimates
   */
  public calculateHeightsForElements(elements: TextElement[]): number[] {
    return elements.map((element) => this.calculateElementHeight(element));
  }
}

export default TextHeightCalculator;
