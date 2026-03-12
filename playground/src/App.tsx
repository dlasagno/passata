import { useMemo } from "react";

import { createTable } from "../../src";
import { pagination, sorting } from "../../src/middlewares";

type Person = {
  id: number;
  name: string;
  age: number;
  city: string;
  score: number;
};

const people: Person[] = [
  { id: 1, name: "Alice", age: 28, city: "Berlin", score: 91 },
  { id: 2, name: "Bruno", age: 34, city: "Lisbon", score: 84 },
  { id: 3, name: "Carla", age: 26, city: "Paris", score: 95 },
  { id: 4, name: "Diego", age: 39, city: "Madrid", score: 72 },
  { id: 5, name: "Emma", age: 31, city: "Rome", score: 88 },
  { id: 6, name: "Farah", age: 24, city: "Cairo", score: 79 },
  { id: 7, name: "Gabe", age: 42, city: "Dublin", score: 90 },
  { id: 8, name: "Hana", age: 29, city: "Prague", score: 86 },
  { id: 9, name: "Ivan", age: 36, city: "Oslo", score: 77 },
  { id: 10, name: "Jules", age: 27, city: "Amsterdam", score: 93 },
  { id: 11, name: "Kira", age: 33, city: "Zurich", score: 81 },
  { id: 12, name: "Luca", age: 30, city: "Milan", score: 89 },
];

const table = createTable(sorting(), pagination({ initialPageSize: 5 }));

export function App() {
  const columns = useMemo(
    () =>
      table.defineColumns<Person>([
        { key: "name", header: "Name", sortable: true },
        { key: "age", header: "Age", sortable: true },
        { key: "city", header: "City", sortable: true },
        {
          key: "score",
          header: "Score",
          sortable: true,
          cell: (value) => <strong>{String(value)}</strong>,
        },
      ]),
    [],
  );

  const tableInstance = table.useTable({
    data: people,
    columns,
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>easy-table playground</h1>
      <p style={{ marginBottom: 16 }}>
        Click headers to sort. Use controls below to test pagination.
      </p>

      <table style={{ borderCollapse: "collapse", minWidth: 520 }}>
        <thead>
          <tr>
            {tableInstance.headers.map((header) => {
              const isSorted = Boolean(header.props.isSorted);
              const sortDirection = header.props.sortDirection as
                | "asc"
                | "desc"
                | null
                | undefined;

              return (
                <th
                  key={header.column.key}
                  style={{
                    borderBottom: "1px solid #d9d9d9",
                    textAlign: "left",
                    padding: "8px 10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => tableInstance.toggleSort(header.column.key)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      font: "inherit",
                      padding: 0,
                    }}
                  >
                    {header.column.header}
                    {isSorted ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tableInstance.rows.map((row) => (
            <tr key={row.original.id}>
              {columns.map((column) => {
                const value = row.original[column.key];
                return (
                  <td
                    key={column.key}
                    style={{
                      borderBottom: "1px solid #efefef",
                      padding: "8px 10px",
                    }}
                  >
                    {column.cell
                      ? column.cell(value, row.original)
                      : String(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <section style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={tableInstance.previousPage}
          disabled={!tableInstance.canPreviousPage}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={tableInstance.nextPage}
          disabled={!tableInstance.canNextPage}
        >
          Next
        </button>
        <label>
          Page size{" "}
          <select
            value={tableInstance.pageSize}
            onChange={(event) =>
              tableInstance.setPageSize(Number(event.target.value))
            }
          >
            {[3, 5, 10].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </section>

      <p style={{ marginTop: 12 }}>
        Page {tableInstance.pageIndex + 1} of {tableInstance.pageCount} (
        {tableInstance.totalRows} rows total)
      </p>
    </main>
  );
}
