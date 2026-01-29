import { useEffect, useMemo, useRef, useState } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

type Student = {
  id: number;
  studentName: string;
  gender: number;
  grade: number;
  score: number;
};

export default function App() {
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 列定义
  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: (info) => info.getValue<number>(),
        size: 80,
      },
      {
        accessorKey: "studentName",
        header: "名前",
        cell: (info) => info.getValue<string>(),
        size: 180,
      },
      {
        accessorKey: "gender",
        header: "性别",
        cell: (info) => (info.getValue<number>() === 1 ? "男" : "女"),
        size: 80,
      },
      {
        accessorKey: "grade",
        header: "学年",
        cell: (info) => info.getValue<number>(),
        size: 80,
      },
      {
        accessorKey: "score",
        header: "スコア",
        cell: (info) => info.getValue<number>(),
        size: 80,
      },
    ],
    []
  );

  // 拉取数据（走 Vite 代理：/api -> http://localhost:8081）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Student[];
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "fetch error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // 让 table 知道每列大概宽度（可选）
    defaultColumn: {
      size: 120,
    },
  });

  const rows = table.getRowModel().rows;

  // 虚拟滚动容器
  const parentRef = useRef<HTMLDivElement | null>(null);

  // 每行高度（px）。你也可以调大/调小
  const rowHeight = 44;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // 表头列宽：用 table 的 column size（可选）
  const leafColumns = table.getAllLeafColumns();
  const totalWidth = leafColumns.reduce((sum, c) => sum + (c.getSize?.() ?? 120), 0);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h2 style={{ margin: "0 0 12px" }}>Students（TanStack Table + Virtual）</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <span>API：/api/students</span>
        <span>総件数：{data.length}</span>
        {loading && <span>加载中...</span>}
        {error && <span style={{ color: "crimson" }}>错误：{error}</span>}
      </div>

      {/* 外层容器：横向可滚动 + 边框 */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        {/* 表头（固定在顶部，模拟 sticky header） */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: totalWidth }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <div
                key={headerGroup.id}
                style={{
                  display: "flex",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "#f7f7f7",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {headerGroup.headers.map((header) => {
                  const width = header.getSize?.() ?? 120;
                  return (
                    <div
                      key={header.id}
                      style={{
                        width,
                        padding: "10px 12px",
                        fontWeight: 700,
                        boxSizing: "border-box",
                        borderRight: "1px solid #eee",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 表体：固定高度，内部纵向滚动（虚拟化） */}
        <div
          ref={parentRef}
          style={{
            height: 520, // 你想显示更高就调这个
            overflow: "auto",
          }}
        >
          {/* 这个是“占位”高度，让滚动条正确 */}
          <div style={{ height: totalSize, position: "relative" }}>
            {/* 横向滚动对齐表头：用同样的 minWidth */}
            <div style={{ minWidth: totalWidth, position: "absolute", left: 0, top: 0, right: 0 }}>
              {virtualItems.map((vi) => {
                const row = rows[vi.index];
                return (
                  <div
                    key={row.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      transform: `translateY(${vi.start}px)`,
                      display: "flex",
                      width: "100%",
                      height: rowHeight,
                      borderBottom: "1px solid #f0f0f0",
                      alignItems: "center",
                      background: vi.index % 2 === 0 ? "#fff" : "#fcfcfc",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const width = cell.column.getSize?.() ?? 120;
                      return (
                        <div
                          key={cell.id}
                          style={{
                            width,
                            padding: "8px 12px",
                            boxSizing: "border-box",
                            borderRight: "1px solid #fafafa",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={String(cell.getValue() ?? "")}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 12, color: "#666" }}>
        説明：バックエンドが5万件返しても、ここでは表示領域の行だけをレンダリングするため、スクロールは滑らかです。
      </p>
    </div>
  );
}
