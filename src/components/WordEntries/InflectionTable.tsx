import React from 'react';
import { Table } from '@mantine/core';
import classes from './InflectionTable.module.css';

interface InflectionTableProps {
  inflection_wordsIAST: string[] | null;
  rowcolstitles: Array<[string, string]> | null;
  useColor?: boolean; // New prop to toggle between styling options
}

const InflectionTable = ({
  inflection_wordsIAST,
  rowcolstitles,
  useColor = false,
}: InflectionTableProps) => {
  if (!inflection_wordsIAST || !Array.isArray(inflection_wordsIAST)) {
    return null;
  }

  if (inflection_wordsIAST.length <= 1) {
    return;
    // <b> </b>;
  }

  let rowtitles = ['First', 'Second', 'Third'];
  let coltitles = ['Singular', 'Dual', 'Plural'];

  const colMapping: { [key: string]: string } = {
    Sg: 'Singular',
    Du: 'Dual',
    Pl: 'Plural',
  };

  if (inflection_wordsIAST.length === 24) {
    rowtitles = ['Nom', 'Acc', 'Inst', 'Dat', 'Abl', 'Gen', 'Loc', 'Voc'];
  }

  let table = [];
  for (let i = 0; i < inflection_wordsIAST.length; i += coltitles.length) {
    table.push(inflection_wordsIAST.slice(i, i + coltitles.length));
  }

  if (inflection_wordsIAST.length === 24) {
    let vocIndex = rowtitles.indexOf('Voc');
    let vocRow = table.splice(vocIndex, 1)[0];
    table.splice(1, 0, vocRow);
    rowtitles.splice(vocIndex, 1);
    rowtitles.splice(1, 0, 'Voc');
  }

  const shouldBeBold = (rowTitle: string, colIndex: number): boolean => {
    if (!rowcolstitles) return false;
    const colTitle = colIndex === 0 ? 'Sg' : colIndex === 1 ? 'Du' : 'Pl';
    return rowcolstitles.some(([row, col]) => row === rowTitle && col === colTitle);
  };

  // Format case titles with period and make them bold
  const formatCaseTitle = (title: string) => {
    return <b>{title}.</b>;
  };

  return (
    // <div className="overflow-x-auto" style={{ width: '60%', margin: '0 auto' }}>
    <div className={classes.inflectionTableContainer}>
      <Table
        withColumnBorders
        highlightOnHover
        striped
        className="w-auto max-w-lg" // Reduced width
        styles={{
          td: {
            padding: '8px 12px', // Reduced padding
            fontSize: '0.95rem', // Slightly smaller font
          },
          th: {
            padding: '8px 12px', // Reduced padding
            backgroundColor: 'transparent',
            fontSize: '0.95rem', // Slightly smaller font
          },
        }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="text-center font-semibold text-sm w-20"></Table.Th>
            {coltitles.map((title, index) => (
              <Table.Th key={index} className="text-center font-semibold text-sm w-28">
                {title}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {table.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              <Table.Td className="font-medium text-sm">
                {formatCaseTitle(rowtitles[rowIndex])}
              </Table.Td>
              {row.map((cell, colIndex) => {
                const isBold = shouldBeBold(rowtitles[rowIndex], colIndex);
                return (
                  <Table.Td
                    key={colIndex}
                    className="text-center text-sm"
                    style={
                      isBold
                        ? useColor
                          ? {
                              //color: '#5b1166',
                              // #ce53e0
                              color: '#83358f', // Darker blue text
                              fontWeight: 'bold',
                            }
                          : { fontWeight: 'bold' }
                        : {}
                    }
                  >
                    {cell}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
};

export default InflectionTable;
