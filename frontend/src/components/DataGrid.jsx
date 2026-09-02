import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { SkeletonRow } from './ui.jsx';

const PAGE_SIZE = 10;

function toCSV(rows, columns) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = c.csv ? c.csv(row) : row[c.key];
          return `"${String(raw ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
}

function downloadCSV(rows, columns, filename) {
  const csv = toCSV(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {{
 *   rows: any[],
 *   columns: {key:string,label:string,render?:(row:any)=>React.ReactNode,csv?:(row:any)=>string}[],
 *   loading?: boolean,
 *   filters?: {key:string,label:string,options:{value:string,label:string}[],value:string,onChange:(v:string)=>void},
 *   searchPlaceholder?: string,
 *   search?: string,
 *   onSearchChange?: (v:string)=>void,
 *   exportFilename?: string,
 * }} props
 */
export default function DataGrid({
  rows,
  columns,
  loading = false,
  filters,
  searchPlaceholder = 'Search…',
  search,
  onSearchChange,
  exportFilename = 'export.csv',
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="flat-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-sm p-md border-b border-border-subtle">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-md py-2 rounded-lg input-flat text-body-sm"
            />
          </div>
        )}

        {filters && (
          <select
            value={filters.value}
            onChange={(e) => {
              filters.onChange(e.target.value);
              setPage(1);
            }}
            className="px-md py-2 rounded-lg input-flat text-body-sm min-h-[40px]"
            aria-label={filters.label}
          >
            {filters.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => downloadCSV(rows, columns, exportFilename)}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-sm px-md py-2 min-h-[40px] rounded-lg text-body-sm font-medium border border-border-subtle text-on-surface hover:bg-surface-hover transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              {columns.map((c) => (
                <th key={c.key} className="px-md py-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)}

            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-md py-xl text-center text-body-sm text-on-surface-muted">
                  No matching results.
                </td>
              </tr>
            )}

            {!loading &&
              paged.map((row, i) => (
                <tr key={row.id ?? i} className="border-b border-border-subtle/60 hover:bg-surface-hover transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className="px-md py-sm text-body-sm text-on-surface whitespace-nowrap">
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — large tap targets per Fitts's Law */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between px-md py-sm border-t border-border-subtle">
          <p className="text-caption text-on-surface-muted">
            Page {page} of {totalPages} &middot; {rows.length} results
          </p>
          <div className="flex items-center gap-xs">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-2 min-w-[40px] min-h-[40px] rounded-lg border border-border-subtle text-on-surface-variant hover:bg-surface-hover disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 min-w-[40px] min-h-[40px] rounded-lg border border-border-subtle text-on-surface-variant hover:bg-surface-hover disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
