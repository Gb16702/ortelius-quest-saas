import type { RowSelectionState } from "@tanstack/react-table"

export function getSelectedRowIds(rowSelection: RowSelectionState): string[] {
    return Object.keys(rowSelection).filter((key) => rowSelection[key])
}
