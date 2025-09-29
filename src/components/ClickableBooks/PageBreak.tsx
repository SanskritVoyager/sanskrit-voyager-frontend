import React from 'react';
import classes from './ClickableSimpleBooks.module.css'; // Adjust the import path as needed

interface ElementAttributes {
  n?: string;
  ed?: string;
  unit?: string;
  rend?: string;
  type?: string;
  [key: string]: any;
}

interface ElementType {
  tag: string;
  attributes?: ElementAttributes;
  children?: ElementType[];
  [key: string]: any;
}

interface PageBreakProps {
  element: ElementType;
  segmentNumber: number | null;
  setSegmentRef?: (el: HTMLDivElement | null) => void;
  renderTextElement: (element: ElementType) => React.ReactNode;
}

const PageBreak: React.FC<PageBreakProps> = ({ element, segmentNumber, setSegmentRef, renderTextElement }) => {
  const { tag, attributes = {}, children } = element;
  let pageText = '';

  if (tag === 'pb') {
    let base = '--- Page';
    if (attributes.n) {
      base += ` ${attributes.n}`;
    }
    if (attributes.ed) {
      base += ` (${attributes.ed})`;
    }
    pageText = `${base} ---`;
  } else if (tag === 'milestone') {
    const unit = attributes.unit || 'Milestone';
    const n_val = attributes.n || '';
    pageText = `--- ${unit}${n_val ? ' ' + n_val : ''} ---`;
  }

  const elementClasses = [
    classes[tag] || '',
    attributes?.rend === 'bold' ? classes.bold : '',
    attributes?.rend === 'it' ? classes.italic : '',
    attributes?.type ? classes[attributes.type] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`${classes.paragraphContainer} ${classes.pageBreak} ${elementClasses}`}
      data-segment-number={segmentNumber}
      ref={setSegmentRef}
      id={segmentNumber !== null ? `segment-${segmentNumber}` : undefined}
      onClick={() => {
        console.log('Clicked page/milestone:', attributes.n, attributes.ed, attributes.unit);
      }}
    >
      <div className={classes.pageBreakTextContainer}>{pageText}</div>
      {children?.map((child, index) => {
        const childWithType = {
          ...child,
          attributes: {
            ...child.attributes,
            type: child.attributes?.type || attributes?.type,
          },
        };
        return <React.Fragment key={index}>{renderTextElement(childWithType)}</React.Fragment>;
      })}
    </div>
  );
};

export default PageBreak;