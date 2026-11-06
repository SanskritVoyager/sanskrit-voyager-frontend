import classes from './DictionaryEntry.module.css';
import { useDisplayWord } from '../../context/TransliterationContext';
import { displaySanskrit } from '../../utils/displayWord';

/** Edgerton and Grassmann give an entry's headword in <b> at its start, after any homonym number */
const BOLD_HEADWORD = /^\s*(?:<hom>[^<]*<\/hom>\s*)?<b>/;
const DEVANAGARI = /\p{Script_Extensions=Devanagari}/u;

interface DictionaryEntryProps {
  entry: string;
  onWordClick?: (word: string, index: number) => void;
}

function DictionaryEntry({ entry, onWordClick }: DictionaryEntryProps) {
  // Sanskrit (<s>, <s1>) is shown in the navbar's scheme; a click looks up the stored word
  const displayWord = useDisplayWord();
  const processContent = (content: string) => {
    // Add this check: If content is null or undefined, return empty result
    if (!content) {
      return []; // Or return null, or an empty string span, depending on desired output
    }

    content = content.replace(/&amp;c\./g, '&c.');

    // remove the <srs/> tag
    // should I remove them ?
    content = content.replace(/<srs\s*\/>/g, '');

    // Where the entry's headword <b> opens (Dharma, agní,), or -1
    const headwordStart = BOLD_HEADWORD.test(content) ? content.indexOf('<b>') : -1;
    let inHeadword = false;
    // Macdonell writes a headword twice in one <s>: in Devanagari, then in his own
    // romanization (धर्म dhár-ma, कृष्ण krish-ná). That is not IAST, so it is shown as printed.
    let inMacdonellHeadword = false;

    let buffer = '';
    const result = [];
    let index = 0;
    let inParentheses = false;
    const tagStack: string[] = [];

    const getClassName = (tag: string): string => {
      switch (tag) {
        case 'hw':
          return 'dictHeadword';
        case 'ab':
          return 'dictAbbreviation';
        case 'lex':
          return 'dictGrammar';
        case 'ls':
          return 'dictSource';
        case 'etym':
          return 'dictEtymology';
        case 'def':
          return 'dictDefinition';
        case 's':
          return 'dictSanskrit';
        case 's1':
          return 'dictName';
        case 'gk':
          return 'dictGreek';
        case 'lang':
          return 'dictLanguage';
        case 'i':
          return 'dictItalic';
        case 'b':
          return 'dictBold';
        case 'div':
          return 'dictDivision';
        case 'hom':
          return 'dictHomonym';
        default:
          return '';
      }
    };

    const createStyledSpan = (text: string) => {
      if (!text) return null;

      const appliedClasses = tagStack.map((tag) => classes[getClassName(tag)]).filter(Boolean);

      if (inParentheses) {
        appliedClasses.push(classes.dictParenthetical);
      }

      // Handle both 's' and 's1' tags with clickable words
      if (tagStack.includes('s') || tagStack.includes('s1')) {
        const isName = tagStack.includes('s1');

        // Split text into words only for Sanskrit terms, keep names as whole
        const textParts: string[] = isName ? [text] : text.split(/(\s+|—|-|\/)/u);

        return textParts.map((word, wordIndex) => {
          if (!word.trim()) return word;

          // Order classes with the most specific last
          const orderedClasses = [
            ...appliedClasses.filter(
              (cls) => cls !== classes.dictSanskrit && cls !== classes.dictName
            ),
            isName ? classes.dictName : classes.dictSanskrit,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <span
              key={`${index}-${wordIndex}`}
              className={orderedClasses}
              onClick={() => onWordClick?.(isName ? word.toLowerCase() : word, index)}
            >
              {inMacdonellHeadword && !DEVANAGARI.test(word) ? word : displayWord(word)}
            </span>
          );
        });
      }

      const shown = inHeadword ? displaySanskrit(displayWord, text) : text;
      if (appliedClasses.length === 0) return shown;

      const orderedClasses = appliedClasses.join(' ');

      return (
        <span key={index++} className={orderedClasses}>
          {shown}
        </span>
      );
    };

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '(' || content[i] === '{') {
        if (buffer) {
          result.push(createStyledSpan(buffer));
          buffer = '';
        }
        inParentheses = true;
        buffer = content[i]; // Start buffer with the current opening bracket
      } else if (content[i] === ')' || content[i] === '}') {
        buffer += content[i]; // Add the current closing bracket to the buffer
        result.push(createStyledSpan(buffer));
        buffer = '';
        inParentheses = false;
      } else if (content[i] === '<') {
        if (content[i + 1] === '/') {
          // Closing tag
          if (buffer) {
            result.push(createStyledSpan(buffer));
            buffer = '';
          }
          let tagName = '';
          i += 2; // Skip </
          while (content[i] !== '>' && i < content.length) {
            tagName += content[i];
            i++;
          }
          // Remove the last matching tag from the stack
          const lastIndex = tagStack.lastIndexOf(tagName);
          if (lastIndex !== -1) {
            tagStack.splice(lastIndex, 1);
          }
          if (tagName === 'b') inHeadword = false;
          if (tagName === 's') inMacdonellHeadword = false;
        } else {
          // Opening tag
          if (buffer) {
            result.push(createStyledSpan(buffer));
            buffer = '';
          }
          const tagStart = i;
          let tagName = '';
          i++; // Skip <
          while (content[i] !== '>' && i < content.length) {
            if (content[i] === ' ') break; // Stop at first space to handle attributes
            tagName += content[i];
            i++;
          }
          // Skip any attributes
          while (content[i] !== '>' && i < content.length) {
            i++;
          }
          tagStack.push(tagName);
          if (tagName === 'b' && tagStart === headwordStart) inHeadword = true;
          if (tagName === 's') {
            const end = content.indexOf('</s>', i);
            inMacdonellHeadword = DEVANAGARI.test(content.slice(i, end === -1 ? undefined : end));
          }
        }
      } else {
        buffer += content[i];
      }
    }

    if (buffer) {
      result.push(createStyledSpan(buffer));
    }

    return result;
  };

  return <div className={classes.dictEntry}>{processContent(entry)}</div>;
}

export default DictionaryEntry;
