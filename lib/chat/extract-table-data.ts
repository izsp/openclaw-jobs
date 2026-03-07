/**
 * Extracts table data (headers + rows) from react-markdown rendered children.
 * Shared between inline result-content and full-screen result-viewer-content.
 */

/** Recursively extracts plain text from a React node tree. */
export function extractTextFromNode(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
  if (typeof node === "object" && "props" in node) {
    return extractTextFromNode(
      (node as React.ReactElement<{ children?: React.ReactNode }>).props
        .children,
    );
  }
  return "";
}

/** Walks react-markdown table elements to extract headers and row data. */
export function extractTableData(node: React.ReactNode): {
  headers: string[];
  rows: string[][];
} {
  const headers: string[] = [];
  const rows: string[][] = [];

  function walk(
    n: React.ReactNode,
    ctx: "thead" | "tbody" | "none",
  ): void {
    if (!n) return;
    if (Array.isArray(n)) {
      n.forEach((c) => walk(c, ctx));
      return;
    }
    if (typeof n === "object" && "props" in n) {
      const el = n as React.ReactElement<{ children?: React.ReactNode }>;
      const tag = typeof el.type === "string" ? el.type : "";
      const nextCtx =
        tag === "thead"
          ? ("thead" as const)
          : tag === "tbody"
            ? ("tbody" as const)
            : ctx;

      if (tag === "tr") {
        const cells: string[] = [];
        const ch = Array.isArray(el.props.children)
          ? el.props.children
          : [el.props.children];
        for (const c of ch) {
          if (c && typeof c === "object" && "props" in c) {
            cells.push(
              extractTextFromNode(
                (c as React.ReactElement<{ children?: React.ReactNode }>).props
                  .children,
              ),
            );
          }
        }
        if (nextCtx === "thead" || (ctx === "none" && headers.length === 0)) {
          headers.push(...cells);
        } else {
          rows.push(cells);
        }
        return;
      }
      walk(el.props.children, nextCtx);
    }
  }

  walk(node, "none");
  return { headers, rows };
}
