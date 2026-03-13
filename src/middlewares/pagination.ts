import type { TableMiddleware } from "../types";

type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

type PaginationApi = {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;
};

export function pagination(options?: {
  initialPageSize?: number;
}): TableMiddleware<
  Record<never, never>,
  PaginationState,
  PaginationApi
> {
  const initialPageSize = Math.max(1, options?.initialPageSize ?? 25);

  return {
    id: "pagination",
    initialState: {
      pageIndex: 0,
      pageSize: initialPageSize,
    },
    getStateSlice(state) {
      return `${state.pageIndex}:${state.pageSize}`;
    },
    processRows(rows, state) {
      const safePageSize = Math.max(1, state.pageSize);
      const safePageIndex = Math.max(0, state.pageIndex);
      const start = safePageIndex * safePageSize;
      return rows.slice(start, start + safePageSize);
    },
    api(state, setState, context) {
      const safePageSize = Math.max(1, state.pageSize);
      const safePageIndex = Math.max(0, state.pageIndex);
      const totalRows = context.rowCount;
      const pageCount = Math.max(1, Math.ceil(totalRows / safePageSize));
      const clampedPageIndex = Math.min(safePageIndex, pageCount - 1);

      return {
        pageIndex: clampedPageIndex,
        pageSize: safePageSize,
        pageCount,
        totalRows,
        canPreviousPage: clampedPageIndex > 0,
        canNextPage: clampedPageIndex < pageCount - 1,
        setPageIndex(pageIndex: number) {
          setState({
            pageIndex: Math.max(0, Math.min(Math.floor(pageIndex), pageCount - 1)),
          });
        },
        setPageSize(pageSize: number) {
          const nextPageSize = Math.max(1, Math.floor(pageSize));
          setState({
            pageSize: nextPageSize,
            pageIndex: 0,
          });
        },
        nextPage() {
          setState((prev) => ({
            pageIndex: Math.min(prev.pageIndex + 1, pageCount - 1),
          }));
        },
        previousPage() {
          setState((prev) => ({
            pageIndex: Math.max(prev.pageIndex - 1, 0),
          }));
        },
      };
    },
  };
}
