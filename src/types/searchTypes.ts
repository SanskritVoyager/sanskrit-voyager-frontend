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
