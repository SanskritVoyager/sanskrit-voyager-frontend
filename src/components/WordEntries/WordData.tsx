import React from 'react';

interface Inflection {
  caseAbbr: string;
  numberAbbr: string;
}

interface Entry {
  title: string;
  description: string;
  inflections: Inflection[];
  inflection_wordsIAST: string[];
  from: string;
  alternativeTitle: string;
  vocabularyEntries: string[];
}

interface WordDataProps {
  data: Entry[] | null;
}
const WordData: React.FC<WordDataProps> = ({ data }) => {
  // console.log('Data:', data); // Log the entire data prop

  if (!data) {
    return <div style={{ flex: 1 }}>No data</div>;
  }

  return (
    <div style={{ flex: 1 }}>
      {data.map((entry, index) => {
        // console.log('Entry:', entry); // Log each entry

        return (
          <div key={index}>
            <h1 className="text-xl" style={{ fontFamily: 'Garamond', fontWeight: 'bold' }}>
              {entry.title}
            </h1>
            {entry.title !== entry.alternativeTitle && (
              <p style={{ fontFamily: 'Garamond' }}>{entry.alternativeTitle}</p>
            )}
            {entry.title !== entry.from && (
              <p>
                <span style={{ fontFamily: 'Garamond' }}>from:</span>{' '}
                <span style={{ fontFamily: 'Garamond', fontStyle: 'italic' }}>{entry.from}</span>
              </p>
            )}
            <p>{entry.description}</p>
            {entry.inflections &&
              entry.inflections.map((inflection, index) => {
                // console.log('Inflection:', inflection); // Log each inflection

                const { caseAbbr } = inflection;
                const { numberAbbr } = inflection;

                const caseFull = caseAbbr
                  .split(',')
                  .map((abbr) => {
                    switch (abbr.trim()) {
                      case 'Nom':
                        return 'Nominative';
                      case 'Acc':
                        return 'Accusative';
                      case 'Voc':
                        return 'Vocative';
                      case 'Ins':
                        return 'Instrumental';
                      case 'Dat':
                        return 'Dative';
                      case 'Abl':
                        return 'Ablative';
                      case 'Gen':
                        return 'Genitive';
                      case 'Loc':
                        return 'Locative';
                      default:
                        return abbr;
                    }
                  })
                  .join(', ');

                const numberFull = numberAbbr
                  .split(',')
                  .map((abbr) => {
                    switch (abbr.trim()) {
                      case 'Sg':
                        return 'Singular';
                      case 'Du':
                        return 'Dual';
                      case 'Pl':
                        return 'Plural';
                      default:
                        return abbr;
                    }
                  })
                  .join(', ');

                return (
                  <span key={index} style={{ fontFamily: 'Garamond', fontStyle: 'italic' }}>
                    {caseFull}, {numberFull}
                    {index < entry.inflections.length - 1 && ' or '}
                  </span>
                );
              })}

            {entry.vocabularyEntries.map((item, index) => {
              // console.log('Vocabulary entry:', item); // Log each vocabulary entry

              return (
                <p
                  key={index}
                  dangerouslySetInnerHTML={{
                    __html: item.replace(
                      /<s>(.*?)<\/s>/g,
                      '<span style="font-style:italic;">$1</span>'
                    ),
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default WordData;
