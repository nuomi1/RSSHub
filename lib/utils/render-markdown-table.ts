import { z } from 'zod';

/** Column alignment as declared by a GFM table delimiter row. */
const MarkdownTableAlignSchema = z.enum(['left', 'center', 'right']);

/**
 * A header column. A plain string means "no alignment declared"; the object form declares one.
 */
const MarkdownTableHeaderSchema = z.union([
    z.string(),
    z.object({
        title: z.string(),
        align: MarkdownTableAlignSchema,
    }),
]);

/** One data row: a cell per column. */
const MarkdownTableRowSchema = z.array(z.string());

/**
 * A GFM table described as data: one header per column plus zero or more data rows.
 *
 * Row cell counts must match `headers`. Alignment lives on the header that declares it, so a
 * table can mix aligned and unaligned columns.
 */
export const MarkdownTableSchema = z
    .object({
        headers: z.array(MarkdownTableHeaderSchema).min(1, 'headers must contain at least one column'),
        rows: z.array(MarkdownTableRowSchema),
    })
    .superRefine((table, ctx) => {
        for (const [index, row] of table.rows.entries()) {
            if (row.length !== table.headers.length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['rows', index],
                    message: `row ${index} has ${row.length} cell(s) but headers has ${table.headers.length} column(s)`,
                });
            }
        }
    });

export type MarkdownTable = z.infer<typeof MarkdownTableSchema>;

type MarkdownTableAlign = z.infer<typeof MarkdownTableAlignSchema>;
type MarkdownTableHeader = z.infer<typeof MarkdownTableHeaderSchema>;

/** Delimiter cell emitted when a column declares no alignment. GFM treats it as default (left). */
const DEFAULT_DELIMITER = '---';

const ALIGN_DELIMITERS = new Map<MarkdownTableAlign, string>([
    ['left', ':---'],
    ['center', ':---:'],
    ['right', '---:'],
]);

/** Maps a declared alignment to the delimiter cell that expresses it in the delimiter row. */
const delimiterFor = (align?: MarkdownTableAlign): string => (align ? (ALIGN_DELIMITERS.get(align) ?? DEFAULT_DELIMITER) : DEFAULT_DELIMITER);

const headerTitle = (header: MarkdownTableHeader): string => (typeof header === 'string' ? header : header.title);

const headerAlign = (header: MarkdownTableHeader): MarkdownTableAlign | undefined => (typeof header === 'string' ? undefined : header.align);

/**
 * Normalises a cell for use in a table row: trims surrounding whitespace, keeps newlines from
 * breaking the row, and escapes pipes that would otherwise be read as column separators.
 *
 * Already escaped pipes (`\|`) are left untouched so migrating an existing table does not
 * double-escape them.
 */
const renderCell = (value: string): string =>
    value
        .trim()
        .replaceAll(/\r\n?/g, '\n')
        .replaceAll(/(?<!\\)\|/g, String.raw`\|`)
        .replaceAll('\n', '<br>');

const renderRow = (cells: string[]): string => `| ${cells.join(' | ')} |`;

/**
 * Renders a GFM table from structured data.
 *
 * The output is a plain (unpadded) markdown table, so `remark-gfm` will re-align it to the same
 * rendering as an equivalent hand-written table. Rendering several tables into one description
 * is done by joining the results with a blank line (`\n\n`), which keeps them as separate tables.
 *
 * @param table - Table data, validated by `MarkdownTableSchema` before rendering.
 * @returns The table as a markdown string, one line per row.
 * @throws ZodError when a row's cell count does not match the column count.
 *
 * @example
 * renderMarkdownTable({
 *     headers: ['分类', { title: '编号', align: 'center' }],
 *     rows: [
 *         ['首页', ''],
 *         ['轻松一刻', 'qsyk'],
 *     ],
 * });
 */
export const renderMarkdownTable = (table: MarkdownTable): string => {
    const { headers, rows } = MarkdownTableSchema.parse(table);

    const headerCells = headers.map((header) => renderCell(headerTitle(header)));
    const delimiterCells = headers.map((header) => delimiterFor(headerAlign(header)));
    const bodyRows = rows.map((row) => renderRow(row.map((cell) => renderCell(cell))));

    return [renderRow(headerCells), renderRow(delimiterCells), ...bodyRows].join('\n');
};
