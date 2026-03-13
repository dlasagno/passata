import { createTable } from "./create-table";
import { sorting } from "./middlewares";

interface Person {
  name: string;
  age: number;
  city: string;
}

const { useTable, defineColumns } = createTable(sorting());
const columns = defineColumns<Person>(({ accessor }) => [
  accessor("name", {
    header: "Name",
    cell: (value) => value.toUpperCase(),
  }),
  accessor("age", {
    header: "Age",
    cell: (value) => value.toFixed(0),
  }),
  accessor("city", { header: "City" }),
]);

const table = useTable({
  data: [],
  columns,
});

table.toggleSort("name");

const headerProps = table.headers[0]?.props;
if (headerProps) {
  const isSorted: boolean = headerProps.isSorted;
  const sortDirection: "asc" | "desc" | null = headerProps.sortDirection;
  void isSorted;
  void sortDirection;
}
