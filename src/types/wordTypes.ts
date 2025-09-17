// types/wordTypes.ts
export type InflectionEntry = [string, string]; // [caseAbbr, numberAbbr]

export type LongEntry = [
  string, // entry[0] - word
  string, // entry[1] - grammar
  InflectionEntry[], // entry[2] - inflections
  string[], // entry[3] - inflection_wordsIAST
  string, // entry[4] - etymology
  string, // entry[5] - pronunciation
  { [dictionaryName: string]: { [wordName: string]: string[] } }, // entry[6] - vocabulary entries
];

export type ShortEntry = [
  string, // entry[0] - word
  string, // entry[1] - components
  { [dictionaryName: string]: { [wordName: string]: string[] } }, // entry[2] - vocabulary entries
];

export type WordEntry = LongEntry | ShortEntry;

export type GroupedEntries = {
  [key: string]: WordEntry[];
};

export type DictionaryLabels = {
  [key: string]: string;
};
