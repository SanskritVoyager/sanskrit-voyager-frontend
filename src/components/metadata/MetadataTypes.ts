// Enhanced Metadata type definitions that support both simple and complex formats

interface ContentItem {
  type: string;
  value?: string;
  content?: ContentItem[];
  attributes?: Record<string, string>;
  text?: string;
  items?: any[];
}

interface TitleInfo {
  content?: ContentItem[];
  text?: string;
  type?: string;
  lang?: string;
  [key: string]: any;
}

interface AuthorInfo {
  content?: ContentItem[];
  name?: string;
  ref?: string;
  [key: string]: any;
}

interface ContributorInfo {
  // Simple format fields
  role?: string;
  name?: string;
  when?: string;

  // Complex format fields
  responsibility?: string;
  name_attributes?: Record<string, string>;
  responsibility_attributes?: Record<string, string>;
  id?: string;
  [key: string]: any;
}

interface LicenseInfo {
  text?: string;
  target?: string;
  content?: ContentItem[];
  [key: string]: any;
}

interface PublicationInfo {
  authority?: string | { type: string; content: ContentItem[] };
  publisher?: string | { type: string; content: ContentItem[] };
  date?: { text?: string; [key: string]: any } | string;
  availability?: {
    status?: string;
    license_declaration?: LicenseInfo;
    full_description?: ContentItem[];
    [key: string]: any;
  };
}

interface SourceInfo {
  type: string;
  id?: string;
  full_text_concat?: string;
  titles?: TitleInfo[];
  authors?: AuthorInfo[];
  editors?: AuthorInfo[];
  publisher?: string | { type: string; content: ContentItem[] };
  pubPlace?: string | { type: string; content: ContentItem[] };
  date?: { text?: string; [key: string]: any };
  notes?: { type: string; content: ContentItem[] }[];
  [key: string]: any;
}

interface PrincipalInfo {
  person_name?: string;
  organization_name?: string;
  person_attributes?: Record<string, string>;
  organization_attributes?: Record<string, string>;
}

interface EncodingDescription {
  description_paragraphs?: { type: string; content: ContentItem[] }[];
  editorial_declaration?: {
    description_paragraphs?: { type: string; content: ContentItem[] }[];
    correction?: any;
    normalization?: any;
    quotation?: any;
    hyphenation?: any;
    segmentation?: any;
    interpretation?: any;
    [key: string]: any;
  };
  class_declaration?: any;
  class_declaration_text?: string;
}

interface RevisionInfo {
  when?: string;
  who?: string;
  description_text?: string;
  description_content?: ContentItem[];
  description_text_summary?: string;
  [key: string]: any;
}

export interface Metadata {
  // Common fields (both formats)
  original_title?: string;
  author?: string;

  // Simple format fields
  contributors?: ContributorInfo[];
  publisher?: string;
  license?: LicenseInfo;
  publication_date?: string;
  source?: string;

  // Complex format fields
  document_id?: string;
  header_language?: string;
  titles?: TitleInfo[];
  authors?: AuthorInfo[];
  principal?: PrincipalInfo;
  funder?: string | { type: string; content: ContentItem[] };
  publication?: PublicationInfo;
  sources?: SourceInfo[];
  encoding_description?: EncodingDescription;
  encoding_info?: any; // For backward compatibility
  languages?: any[];
  classification?: any;
  profile_description_other?: any;
  revisions?: RevisionInfo[];
  notes_statement?: any[];

  // Allow for additional fields
  [key: string]: any;
}
