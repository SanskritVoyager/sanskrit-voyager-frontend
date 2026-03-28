import React from 'react';
import { Title, Text, Accordion, Stack, Badge, Group, Divider, Box, Paper } from '@mantine/core';
import type { Metadata } from './MetadataTypes.js';
import classes from './Metadata.module.css';

interface MetadataProps {
  metadata: Metadata;
}

// Helper to detect if we have complex metadata
const isComplexMetadata = (metadata: any): boolean => {
  return !!(
    metadata.titles ||
    metadata.authors ||
    metadata.publication?.availability ||
    metadata.sources
  );
};

// Helper to safely extract text from content array
const extractTextFromContent = (content: any[]): string => {
  if (!content || !Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (item.type === 'text') return item.value;
      if (item.content) return extractTextFromContent(item.content);
      return '';
    })
    .join('');
};

// Helper to check if a value is empty
const isEmpty = (value: any): boolean => {
  if (!value) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

// Component for rendering structured content (for revision history)
const StructuredContent: React.FC<{ content: any[] }> = ({ content }) => {
  if (!content || !Array.isArray(content)) return null;

  return (
    <>
      {content.map((item, index) => {
        if (item.type === 'text') {
          return <span key={index}>{item.value}</span>;
        }

        if (item.type === 'note') {
          return (
            <Paper key={index} p="md" my="md" className={classes.noteBlock}>
              <StructuredContent content={item.content} />
            </Paper>
          );
        }

        if (item.type === 'p') {
          return (
            <Text key={index} component="p" mb="sm">
              <StructuredContent content={item.content} />
            </Text>
          );
        }

        if (item.type === 'list') {
          return (
            <Box key={index} component="ul" pl="lg" my="sm">
              {item.items?.map((listItem: any, itemIndex: number) => (
                <Box key={itemIndex} component="li" mb="xs">
                  <StructuredContent content={listItem.content} />
                </Box>
              ))}
            </Box>
          );
        }

        if (item.type === 'persName' || item.type === 'placeName') {
          return (
            <Text key={index} span className={classes.textName}>
              <StructuredContent content={item.content} />
            </Text>
          );
        }

        if (item.type === 'ref') {
          return (
            <a
              key={index}
              href={item.attributes?.target}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.link}
            >
              <StructuredContent content={item.content} />
            </a>
          );
        }

        if (item.type === 'code') {
          return (
            <Text
              key={index}
              span
              ff="monospace"
              bg="gray.1"
              px="xs"
              className={classes.inlineCode}
            >
              <StructuredContent content={item.content} />
            </Text>
          );
        }

        if (item.type === 'address') {
          return (
            <Box key={index} component="address" fs="italic" pl="md">
              <StructuredContent content={item.content} />
            </Box>
          );
        }

        if (item.type === 'addrLine') {
          return (
            <Text key={index} component="div">
              <StructuredContent content={item.content} />
            </Text>
          );
        }

        // For any other type with content
        if (item.content) {
          return <StructuredContent key={index} content={item.content} />;
        }

        return null;
      })}
    </>
  );
};

// Component for rendering complex contributors
const ContributorsList: React.FC<{ contributors: any[] }> = ({ contributors }) => {
  return (
    <Stack gap="xs">
      {contributors.map((contributor, index) => {
        const role = contributor.responsibility || contributor.role;
        const name = contributor.name;
        const when = contributor.when || contributor.name_attributes?.when;

        if (isEmpty(name)) return null;

        return (
          <Box key={index} className={classes.contributorItem}>
            <Text>
              <strong>{role?.charAt(0).toUpperCase() + role?.slice(1)}:</strong> {name}
              {when && (
                <Text span c="dimmed" size="xs">
                  {' '}
                  ({when})
                </Text>
              )}
            </Text>
          </Box>
        );
      })}
    </Stack>
  );
};

// Component for rendering sources
const SourcesList: React.FC<{ sources: any[] }> = ({ sources }) => {
  return (
    <Stack gap="md">
      {sources.map((source, index) => (
        <Paper key={index} p="sm" className={classes.sourceItem}>
          {source.titles &&
            source.titles.map((title: any, tIndex: number) => (
              <Text key={tIndex} fw={title.type === 'main' ? 600 : 400}>
                {title.text}
              </Text>
            ))}
          {source.authors && (
            <Text c="dimmed">by {source.authors.map((a: any) => a.name).join(', ')}</Text>
          )}
          {source.publisher && (
            <Text>
              Publisher:{' '}
              {typeof source.publisher === 'string'
                ? source.publisher
                : extractTextFromContent(source.publisher.content)}
            </Text>
          )}
          {source.date && <Text>Date: {source.date.text || source.date.when_iso || (typeof source.date === 'string' ? source.date : '')}</Text>}
          {source.notes &&
            source.notes.map((note: any, nIndex: number) => (
              <Text key={nIndex} size="xs" c="dimmed" fs="italic">
                {extractTextFromContent(note.content)}
              </Text>
            ))}
          {source.full_text_concat && !source.titles && <Text>{source.full_text_concat}</Text>}
        </Paper>
      ))}
    </Stack>
  );
};

// Component for rendering publication info
const PublicationInfo: React.FC<{ publication: any }> = ({ publication }) => {
  const { authority, publisher, date, availability } = publication;

  return (
    <Stack gap="xs">
      {authority && !isEmpty(authority) && (
        <Text>
          <strong>Authority:</strong>{' '}
          {typeof authority === 'string' ? authority : extractTextFromContent(authority.content)}
        </Text>
      )}
      {publisher && !isEmpty(publisher) && (
        <Text>
          <strong>Publisher:</strong>{' '}
          {typeof publisher === 'string' ? publisher : extractTextFromContent(publisher.content)}
        </Text>
      )}
      {date && !isEmpty(date) && (
        <Text>
          <strong>Date:</strong> {date.text || date.when_iso || (typeof date === 'string' ? date : JSON.stringify(date))}
        </Text>
      )}
      {availability?.license_declaration && !isEmpty(availability.license_declaration) && (
        <Box>
          <Text>
            <strong>License:</strong>
          </Text>
          <a
            href={availability.license_declaration.target}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.licenseLink}
          >
            {availability.license_declaration.text ||
              extractTextFromContent(availability.license_declaration.content)}
          </a>
        </Box>
      )}
    </Stack>
  );
};

// Component for rendering revision history with full content
const RevisionHistory: React.FC<{ revisions: any[] }> = ({ revisions }) => {
  return (
    <Stack gap="md">
      {revisions.map((revision, index) => {
        const hasFullContent =
          revision.description_content && revision.description_content.length > 0;

        return (
          <Paper key={index} className={classes.revisionCard} withBorder>
            <Group gap="xs" mb={hasFullContent ? 'md' : 0}>
              {revision.when && (
                <Badge size="sm" variant="light" classNames={{ root: classes.badgeRoot }}>
                  {revision.when}
                </Badge>
              )}
              {revision.who && <Text className={classes.revisionAuthor}>{revision.who}</Text>}
            </Group>

            {revision.description_text && !hasFullContent && (
              <Text size="sm">{revision.description_text}</Text>
            )}

            {hasFullContent && (
              <Box className={classes.revisionContent}>
                <StructuredContent content={revision.description_content} />
              </Box>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};

const MetadataComponent: React.FC<MetadataProps> = ({ metadata }) => {
  if (!metadata) return null;

  const isComplex = isComplexMetadata(metadata);

  // Parse title to extract main title and subtitle
  const parseTitle = (title: string) => {
    if (!title) return { mainTitle: '', subtitle: '' };

    const openParenIndex = title.indexOf('(');
    const openBracketIndex = title.indexOf('[');

    if (openParenIndex === -1 && openBracketIndex === -1) {
      return { mainTitle: title, subtitle: '' };
    }

    const splitIndex = openParenIndex !== -1 ? openParenIndex : openBracketIndex;
    const mainTitle = title.substring(0, splitIndex).trim();
    const subtitle = title.substring(splitIndex).trim();
    return { mainTitle, subtitle };
  };

  // Get title based on format
  const titleText = metadata.original_title || '';
  const { mainTitle, subtitle } = parseTitle(titleText);

  // Calculate title size based on length
  const getTitleSize = (title: string) => {
    const length = title.length;
    if (length < 30) return 'text-4xl';
    if (length < 50) return 'text-3xl';
    if (length < 70) return 'text-2xl';
    return 'text-xl';
  };

  const titleSize = getTitleSize(mainTitle);

  return (
    <div className={classes.metadataContainer}>
      <Title
        order={1}
        className={`${classes.bookTitle} ${classes[titleSize]}`}
        style={{
          lineHeight: 1.2,
          marginBottom: subtitle ? '0.5rem' : '1rem',
          wordBreak: 'break-word',
          hyphens: 'auto',
        }}
      >
        {mainTitle}
      </Title>

      {subtitle && (
        <Text
          size="lg"
          className={classes.bookSubtitle}
          style={{
            marginBottom: '1rem',
            marginTop: '1.5rem',
            marginLeft: '1rem',
            fontStyle: 'italic',
            color: 'var(--mantine-color-dimmed)',
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </Text>
      )}

      {/* Authors - handle both simple and complex formats */}
      {(metadata.author || metadata.authors) && (
        <Text size="lg" className={classes.authorLine}>
          by {metadata.author || metadata.authors?.map((a) => a.name).join(', ')}
        </Text>
      )}

      <Accordion
        className={classes.metadataAccordion}
        // variant="contained"
        classNames={{
          root: classes.metadataAccordionRoot,
          panel: classes.metadataAccordionPanel,
          item: classes.metadataAccordionItem,
          control: classes.metadataAccordionControl,
          content: classes.metadataAccordionContent,
          label: classes.metadataAccordionLabel,
        }}
      >
        <Accordion.Item value="metadata" className={classes.accordionItem}>
          <Accordion.Control className={classes.accordionHeader}>
            Additional Information
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              {/* Basic Information Section */}

              {/* Principal investigator (new field) */}
              {metadata.principal && !isEmpty(metadata.principal) && (
                <Text size="md" c="dimmed" mb="md" mt="md">
                  Principal: {metadata.principal.person_name}
                  {metadata.principal.organization_name &&
                    ` (${metadata.principal.organization_name})`}
                </Text>
              )}

              {(metadata.publisher ||
                metadata.publication ||
                metadata.publication_date ||
                metadata.license ||
                metadata.funder) && (
                <Box>
                  <Text mb="sm" className={classes.sectionTitle}>
                    Basic Information
                  </Text>
                  <Stack gap="sm">
                    {/* Simple publisher or complex publication info */}
                    {metadata.publisher && !metadata.publication && (
                      <Text className={classes.metadataItem}>
                        <strong>Publisher:</strong> {metadata.publisher}
                      </Text>
                    )}

                    {metadata.publication && !isEmpty(metadata.publication) && (
                      <PublicationInfo publication={metadata.publication} />
                    )}

                    {metadata.publication_date && !metadata.publication?.date && (
                      <Text className={classes.metadataItem}>
                        <strong>Publication Date:</strong> {metadata.publication_date}
                      </Text>
                    )}

                    {/* Simple license */}
                    {metadata.license && !metadata.publication?.availability && (
                      <Text className={classes.metadataItem}>
                        <strong>License: </strong>
                        <a
                          href={metadata.license.target}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classes.licenseLink}
                        >
                          {metadata.license.text}
                        </a>
                      </Text>
                    )}

                    {/* Funder (new field) */}
                    {metadata.funder && !isEmpty(metadata.funder) && (
                      <Text className={classes.metadataItem}>
                        <strong>Funder:</strong>{' '}
                        {typeof metadata.funder === 'string'
                          ? metadata.funder
                          : extractTextFromContent(metadata.funder.content)}
                      </Text>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Contributors Section */}
              {metadata.contributors && !isEmpty(metadata.contributors) && (
                <Box>
                  <Divider my="md" />
                  <Text mb="sm" className={classes.sectionTitle}>
                    Contributors ({metadata.contributors.length})
                  </Text>
                  <ContributorsList contributors={metadata.contributors} />
                </Box>
              )}

              {/* Sources Section */}
              {metadata.sources && !isEmpty(metadata.sources) && (
                <Box>
                  <Divider my="md" />
                  <Text mb="sm" className={classes.sectionTitle}>
                    Sources & References
                  </Text>
                  <SourcesList sources={metadata.sources} />
                </Box>
              )}

              {/* Simple source (backward compatibility) */}
              {metadata.source && !metadata.sources && (
                <Box>
                  <Divider my="md" />
                  <Text mb="sm" className={classes.sectionTitle}>
                    Source Information
                  </Text>
                  <Text className={classes.metadataItem}>{metadata.source}</Text>
                </Box>
              )}

              {/* Notes Statement */}
              {metadata.notes_statement && !isEmpty(metadata.notes_statement) && (
                <Box>
                  <Divider my="md" />
                  <Text mb="sm" className={classes.sectionTitle}>
                    Notes
                  </Text>
                  <Stack gap="sm">
                    {metadata.notes_statement.map((note: any, index: number) => (
                      <Text key={index}>{extractTextFromContent(note.content)}</Text>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Encoding Description (new field) */}
              {metadata.encoding_description && !isEmpty(metadata.encoding_description) && (
                <Box>
                  <Divider my="md" />
                  <Text mb="sm" className={classes.sectionTitle}>
                    Technical Details
                  </Text>
                  <Stack gap="sm">
                    {metadata.encoding_description.description_paragraphs?.map(
                      (para: any, index: number) => (
                        <Text key={index}>{extractTextFromContent(para.content)}</Text>
                      )
                    )}
                    {metadata.encoding_description.editorial_declaration && (
                      <Box>
                        <Text mb="xs">Editorial Declaration:</Text>
                        {Object.entries(metadata.encoding_description.editorial_declaration).map(
                          ([key, value]: [string, any]) => {
                            if (isEmpty(value)) return null;
                            return (
                              <Text key={key} pl="md">
                                <strong>{key}:</strong>{' '}
                                {value.text ||
                                  (value.paragraphs_content &&
                                    extractTextFromContent(value.paragraphs_content[0].content))}
                              </Text>
                            );
                          }
                        )}
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Revisions (new field) - with full content */}
              {metadata.revisions && !isEmpty(metadata.revisions) && (
                <Box>
                  <Divider my="md" />
                  <Text mb="sm" className={classes.sectionTitle}>
                    Revision History & Editorial Notes
                  </Text>
                  <RevisionHistory revisions={metadata.revisions} />
                </Box>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};

export default MetadataComponent;
