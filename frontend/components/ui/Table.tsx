export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({ columns, rows, rowKey, onRowClick }: TableProps<T>) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="sr-only">
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? "cursor-pointer hover:bg-zinc-50" : ""}
          >
            {columns.map((col) => (
              <td key={col.key} className={`px-6 py-4 align-middle ${col.className ?? ""}`}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
