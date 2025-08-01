// src/types/bookTypes.ts
export type Contributor = {
  role: string;
  name: string;
  when: string;
};

export type License = {
  text: string;
  target: string;
};

export type Metadata = {
  original_title: string;
  author?: string;
  contributors?: Contributor[];
  publisher?: string;
  license?: License;
  publication_date?: string;
  source?: string;
  text_id?: string;
  collection?: string;
  category?: string;
};

export type TextElement = {
  tag: string;
  attributes: Record<string, string>;
  text?: string;
  translated_text?: string;
  children?: TextElement[];
  segment_number?: number;
};

// Original BookText format for JSON files
export type BookText = {
  file_title?: string;
  file_title_normal?: string;
  metadata?: Metadata;
  body?: TextElement[];
  isApiSource?: false;
};

// New format for API-returned data
export type ApiSegment = {
  segment_id: string;
  segment_number: number;
  text: string;
};

export type ApiBookText = {
  text_id: string;
  title: string;
  author?: string;
  collection?: string;
  category?: string;
  segments: ApiSegment[];
  isApiSource: true;
  metadata?: Metadata;
};

// Combined type for the application
export type BookContent = BookText | ApiBookText;

// Helper function to check if BookContent is an ApiBookText
export function isApiBookText(bookContent: BookContent): bookContent is ApiBookText {
  return (bookContent as ApiBookText).isApiSource === true;
}

// Types for the API responses
export interface SegmentResult {
  segment_id: string;
  segment_number: number;
  text: string;
  highlighted_text: string;
  book_title?: string;
  title?: string;
  author?: string;
  rank: number;
}

export interface BookResult {
  text_id: string;
  book_title: string;
  title: string;
  author: string;
  collection: string;
  category: string;
  occurrence_count: number;
  segments: SegmentResult[];
}

// Define the possible search result types
export type SearchResult =
  | {
      type: 'segments';
      results: SegmentResult[];
    }
  | {
      type: 'books';
      results: BookResult[];
    };
