// apiService.ts
import { BookText, TextElement } from '../types/bookTypes';

// Base URL for the API
const API_BASE_URL = 'https://api.yogasutratrees.com/api';

// Function to handle API errors
const handleApiError = (response: Response) => {
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Function to fetch book text by title
export const fetchBookText = async (title: string): Promise<BookText> => {
  try {
    const response = await fetch(`${API_BASE_URL}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }), // Pass the title directly
    });
    // console.log('title', title);

    const data = await handleApiError(response);

    // Convert API response to BookText format
    return formatApiResponseToBookText(data, title);
  } catch (error) {
    console.error('Error fetching book text:', error);
    throw error;
  }
};

// Function to search texts
export const searchTexts = async (params: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    return await handleApiError(response);
  } catch (error) {
    console.error('Error searching texts:', error);
    throw error;
  }
};

// Function to fetch book titles
export const fetchBookTitles = async (filters: any = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/titles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    return await handleApiError(response);
  } catch (error) {
    console.error('Error fetching book titles:', error);
    throw error;
  }
};

// Helper function to convert API response to BookText format
const formatApiResponseToBookText = (segments: any[], titleOrId: string): BookText => {
  // Extract metadata if available from the first segment
  const firstSegment = segments[0] || {};
  const title = firstSegment.book_title || firstSegment.title || titleOrId;

  // Create a basic BookText structure
  const bookText: BookText = {
    metadata: {
      original_title: title,
    },
    body: segments.map((segment) =>
      // Convert each segment to a TextElement
       ({
        segment_number: segment.segment_number,
        text: segment.text,
      } as TextElement)
    ),
  };

  return bookText;
};
