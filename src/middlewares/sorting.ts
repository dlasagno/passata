import type { TableMiddleware } from "../types";

type SortDirection = "asc" | "desc";

type SortingColumnExt = {
  sortable?: boolean;
  sortFn?: (a: unknown, b: unknown) => number;
};

type SortingState = {
  sortKey: string | null;
  sortDirection: SortDirection;
};

type SortingApi = {
  toggleSort: (key: string) => void;
  clearSort: () => void;
};

export function sorting(): TableMiddleware<
  Record<string, unknown>,
  SortingColumnExt,
  SortingState,
  SortingApi
> {
  return {
    id: "sorting",
    initialState: {
      sortKey: null,
      sortDirection: "asc",
    },
    getStateSlice(state) {
      return `${state.sortKey ?? ""}:${state.sortDirection}`;
    },

    processRows(rows, state, columns) {
      if (!state.sortKey) return rows;

      const column = columns.find((c) => c.key === state.sortKey);
      if (!column || column.sortable === false) return rows;

      const sorted = [...rows].sort((a, b) => {
        const key = state.sortKey;
        if (!key) return 0;
        const aVal = (a.original as Record<string, unknown>)[key];
        const bVal = (b.original as Record<string, unknown>)[key];

        const result = column.sortFn
          ? column.sortFn(aVal, bVal)
          : defaultSort(aVal, bVal);

        return state.sortDirection === "asc" ? result : -result;
      });

      return sorted;
    },

    headerProps(column, state) {
      if (column.sortable === false) return {};
      return {
        isSorted: state.sortKey === column.key,
        sortDirection:
          state.sortKey === column.key ? state.sortDirection : null,
      };
    },

    api(_state, setState) {
      return {
        toggleSort(key: string) {
          setState((prev) => ({
            sortKey: key,
            sortDirection:
              prev.sortKey === key && prev.sortDirection === "asc"
                ? "desc"
                : "asc",
          }));
        },
        clearSort() {
          setState({ sortKey: null, sortDirection: "asc" });
        },
      };
    },
  };
}

const defaultSortCollator = new Intl.Collator(undefined, { numeric: true });

function defaultSort(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return defaultSortCollator.compare(String(a), String(b));
}
