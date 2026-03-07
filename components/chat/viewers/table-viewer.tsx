"use client";

import { useState, useMemo, useCallback } from "react";
import { generateCsv } from "@/lib/chat/generate-csv";
import { downloadFile } from "@/lib/chat/download-file";

interface TableViewerProps {
  headers: string[];
  rows: string[][];
  id: string;
}

type SortDirection = "asc" | "desc";

interface SortState {
  columnIndex: number;
  direction: SortDirection;
}

/** Compares two cell values, attempting numeric comparison first. */
function compareCells(a: string, b: string, direction: SortDirection): number {
  const numA = Number(a);
  const numB = Number(b);
  const isNumeric = !isNaN(numA) && !isNaN(numB) && a !== "" && b !== "";

  const result = isNumeric
    ? numA - numB
    : a.localeCompare(b, undefined, { sensitivity: "base" });

  return direction === "asc" ? result : -result;
}

/** Sortable data table with CSV download capability. */
export function TableViewer({ headers, rows, id }: TableViewerProps) {
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { columnIndex, direction } = sort;
    return [...rows].sort((a, b) =>
      compareCells(a[columnIndex] ?? "", b[columnIndex] ?? "", direction),
    );
  }, [rows, sort]);

  const handleHeaderClick = useCallback((columnIndex: number) => {
    setSort((prev) => {
      if (prev?.columnIndex === columnIndex) {
        return prev.direction === "asc"
          ? { columnIndex, direction: "desc" }
          : null;
      }
      return { columnIndex, direction: "asc" };
    });
  }, []);

  const handleDownloadCsv = useCallback(() => {
    const csv = generateCsv(headers, sortedRows);
    downloadFile(csv, `table-${id}.csv`, "text/csv;charset=utf-8");
  }, [headers, sortedRows, id]);

  return (
    <div className="my-2 rounded-lg border border-zinc-700/50 bg-zinc-900">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleDownloadCsv}
          className="rounded px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Download CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {headers.map((header, i) => (
                <HeaderCell
                  key={i}
                  label={header}
                  sortDirection={sort?.columnIndex === i ? sort.direction : null}
                  onClick={() => handleHeaderClick(i)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={rowIdx % 2 === 0 ? "bg-zinc-950/50" : "bg-zinc-900"}
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-2 py-1 text-zinc-400 whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface HeaderCellProps {
  label: string;
  sortDirection: SortDirection | null;
  onClick: () => void;
}

/** Individual sortable column header with direction indicator. */
function HeaderCell({ label, sortDirection, onClick }: HeaderCellProps) {
  const indicator = sortDirection === "asc" ? " \u25B2" : sortDirection === "desc" ? " \u25BC" : "";

  return (
    <th
      onClick={onClick}
      className="cursor-pointer select-none border-b border-zinc-700/50 bg-zinc-900 px-2 py-1.5 text-left font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-orange-400"
    >
      {label}
      {indicator && (
        <span className="ml-1 text-orange-400">{indicator}</span>
      )}
    </th>
  );
}
