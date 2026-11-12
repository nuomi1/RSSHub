import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { type MarkdownTable, MarkdownTableSchema, renderMarkdownTable } from './render-markdown-table';

// ============================================================
// Helpers
// ============================================================

interface MarkdownNode {
    type: string;
    value?: string;
    align?: Array<'left' | 'right' | 'center' | null>;
    children?: MarkdownNode[];
}

const parseMarkdown = (markdown: string): MarkdownNode => remark().use(remarkGfm).parse(markdown) as unknown as MarkdownNode;

const parseTables = (markdown: string): MarkdownNode[] => (parseMarkdown(markdown).children ?? []).filter((node) => node.type === 'table');

const nodeText = (node: MarkdownNode): string => {
    if (typeof node.value === 'string') {
        return node.value;
    }
    return (node.children ?? []).map((child) => nodeText(child)).join('');
};

/** Normalises a parsed table into a comparable shape: per-column alignment plus trimmed cell text. */
const tableShape = (table: MarkdownNode) => ({
    align: table.align ?? [],
    rows: (table.children ?? []).filter((row) => row.type === 'tableRow').map((row) => (row.children ?? []).map((cell) => nodeText(cell).trim())),
});

const firstTableShape = (markdown: string) => tableShape(parseTables(markdown)[0]);

// ============================================================
// Fixtures: descriptions as they exist in the repository today
// ============================================================

const EXCLUSIVE_163_DESCRIPTION = `| 分类     | 编号 |
| -------- | ---- |
| 首页     |      |
| 轻松一刻 | qsyk |
| 槽值     | cz   |
| 人间     | rj   |
| 大国小民 | dgxm |
| 三三有梗 | ssyg |
| 数读     | sd   |
| 看客     | kk   |
| 下划线   | xhx  |
| 谈心社   | txs  |
| 哒哒     | dd   |
| 胖编怪聊 | pbgl |
| 曲一刀   | qyd  |
| 今日之声 | jrzs |
| 浪潮     | lc   |
| 沸点     | fd   |`;

const ZXFB_12371_DESCRIPTION = `| 最新发布 |
| :------: |
|   zxfb   |`;

const THEBLOCKBEATS_DESCRIPTION = `|    快讯   |   文章  |
| :-------: | :-----: |
| newsflash | article |

| 全部 | 深度 | 精选 | 热点追踪 |
| :--: | :--: | :--: | :------: |
|   0  |   1  |   2  |     3    |`;

// ============================================================
// renderMarkdownTable
// ============================================================
describe('renderMarkdownTable', () => {
    describe('table shape', () => {
        it('renders a single column table', () => {
            expect(
                renderMarkdownTable({
                    headers: ['最新发布'],
                    rows: [['zxfb']],
                })
            ).toBe(`| 最新发布 |
| --- |
| zxfb |`);
        });

        it('renders a two column table', () => {
            expect(
                renderMarkdownTable({
                    headers: ['分类', '编号'],
                    rows: [
                        ['首页', ''],
                        ['轻松一刻', 'qsyk'],
                    ],
                })
            ).toBe(`| 分类 | 编号 |
| --- | --- |
| 首页 |  |
| 轻松一刻 | qsyk |`);
        });

        it('renders a three column table', () => {
            const markdown = renderMarkdownTable({
                headers: ['项目', '组别', ':id'],
                rows: [['經濟支持及學生輔導', '生輔一、二組', '2844']],
            });

            expect(markdown.split('\n')).toHaveLength(3);
            expect(firstTableShape(markdown)).toEqual({
                align: [null, null, null],
                rows: [
                    ['项目', '组别', ':id'],
                    ['經濟支持及學生輔導', '生輔一、二組', '2844'],
                ],
            });
        });

        it('keeps a single data row for every input row', () => {
            const rows = Array.from({ length: 17 }, (_, index) => [`标题 ${index}`, `id-${index}`]);
            const table = parseTables(renderMarkdownTable({ headers: ['标题', 'id'], rows }))[0];

            expect(tableShape(table).rows).toHaveLength(rows.length + 1);
        });
    });

    describe('alignment', () => {
        it('emits a plain delimiter when no alignment is declared', () => {
            const markdown = renderMarkdownTable({ headers: ['a', 'b'], rows: [['1', '2']] });

            expect(markdown.split('\n', 2)[1]).toBe('| --- | --- |');
            expect(firstTableShape(markdown).align).toEqual([null, null]);
        });

        it('maps every alignment to its delimiter', () => {
            const markdown = renderMarkdownTable({
                headers: [
                    { title: 'left', align: 'left' },
                    { title: 'center', align: 'center' },
                    { title: 'right', align: 'right' },
                ],
                rows: [['1', '2', '3']],
            });

            expect(markdown.split('\n', 2)[1]).toBe('| :--- | :---: | ---: |');
            expect(firstTableShape(markdown).align).toEqual(['left', 'center', 'right']);
        });

        it('supports undeclared columns mixed with aligned ones', () => {
            const markdown = renderMarkdownTable({
                headers: [{ title: 'a', align: 'center' }, { title: 'b', align: 'right' }, 'c'],
                rows: [['1', '2', '3']],
            });

            expect(markdown.split('\n', 2)[1]).toBe('| :---: | ---: | --- |');
            expect(firstTableShape(markdown).align).toEqual(['center', 'right', null]);
        });
    });

    describe('cell content', () => {
        it('escapes pipes so they do not split the row', () => {
            const markdown = renderMarkdownTable({ headers: ['参数', '说明'], rows: [['type', 'a | b']] });

            expect(markdown).toContain(String.raw`| type | a \| b |`);

            const table = parseTables(markdown)[0];
            expect(tableShape(table).rows[1]).toEqual(['type', 'a | b']);
        });

        it('does not double escape an already escaped pipe', () => {
            const markdown = renderMarkdownTable({ headers: ['说明'], rows: [[String.raw`a \| b`]] });

            expect(markdown).toContain(String.raw`| a \| b |`);
            expect(markdown).not.toContain(String.raw`\\|`);
            expect(firstTableShape(markdown).rows[1]).toEqual(['a | b']);
        });

        it('converts line breaks to <br> instead of splitting the row', () => {
            const markdown = renderMarkdownTable({ headers: ['说明'], rows: [['第一行\n第二行']] });
            const table = parseTables(markdown)[0];

            expect(markdown.split('\n')).toHaveLength(3);
            expect(markdown).toContain('第一行<br>第二行');
            expect(tableShape(table).rows).toHaveLength(2);
        });

        it('trims surrounding whitespace', () => {
            const markdown = renderMarkdownTable({ headers: ['  说明  '], rows: [['  值  ']] });

            expect(markdown).toBe(`| 说明 |
| --- |
| 值 |`);
        });

        it('preserves inline markdown such as code spans, links and html', () => {
            const markdown = renderMarkdownTable({
                headers: ['形式'],
                rows: [['`code`'], ['[文字](https://example.com)'], ['<kbd>Ctrl</kbd>']],
            });

            expect(markdown).toContain('`code`');
            expect(markdown).toContain('[文字](https://example.com)');
            expect(markdown).toContain('<kbd>Ctrl</kbd>');
            expect(parseTables(markdown)[0].children).toHaveLength(4);
        });
    });

    describe('empty body', () => {
        it('still renders a header and delimiter for an empty rows array', () => {
            const markdown = renderMarkdownTable({ headers: ['编号', '栏目'], rows: [] });
            const tables = parseTables(markdown);

            expect(markdown.split('\n')).toHaveLength(2);
            expect(tables).toHaveLength(1);
            expect(tableShape(tables[0]).rows).toEqual([['编号', '栏目']]);
        });
    });

    describe('validation', () => {
        it('rejects a row with a wrong cell count and reports the row index', () => {
            expect(() =>
                renderMarkdownTable({
                    headers: ['a', 'b', 'c'],
                    rows: [
                        ['1', '2', '3'],
                        ['1', '2'],
                    ],
                })
            ).toThrow(/row 1 has 2 cell\(s\) but headers has 3 column\(s\)/);
        });

        it('rejects an unknown alignment', () => {
            expect(MarkdownTableSchema.safeParse({ headers: [{ title: 'a', align: 'middle' }], rows: [] }).success).toBe(false);
        });

        it('rejects a table without columns', () => {
            expect(() => renderMarkdownTable({ headers: [], rows: [] })).toThrow(/headers must contain at least one column/);
        });
    });

    describe('multiple tables', () => {
        it('parses as two tables when joined with a blank line', () => {
            const first = renderMarkdownTable({
                headers: [
                    { title: '快讯', align: 'center' },
                    { title: '文章', align: 'center' },
                ],
                rows: [['newsflash', 'article']],
            });
            const second = renderMarkdownTable({ headers: ['全部', '深度'], rows: [['0', '1']] });
            const tables = parseTables(`${first}\n\n${second}`);

            expect(tables).toHaveLength(2);
            expect(tableShape(tables[1]).rows).toEqual([
                ['全部', '深度'],
                ['0', '1'],
            ]);
        });
    });

    describe('equivalence with existing descriptions', () => {
        it('matches the 163/exclusive description', () => {
            const table: MarkdownTable = {
                headers: ['分类', '编号'],
                rows: [
                    ['首页', ''],
                    ['轻松一刻', 'qsyk'],
                    ['槽值', 'cz'],
                    ['人间', 'rj'],
                    ['大国小民', 'dgxm'],
                    ['三三有梗', 'ssyg'],
                    ['数读', 'sd'],
                    ['看客', 'kk'],
                    ['下划线', 'xhx'],
                    ['谈心社', 'txs'],
                    ['哒哒', 'dd'],
                    ['胖编怪聊', 'pbgl'],
                    ['曲一刀', 'qyd'],
                    ['今日之声', 'jrzs'],
                    ['浪潮', 'lc'],
                    ['沸点', 'fd'],
                ],
            };

            expect(firstTableShape(renderMarkdownTable(table))).toEqual(firstTableShape(EXCLUSIVE_163_DESCRIPTION));
        });

        it('matches the 12371/zxfb description', () => {
            const markdown = renderMarkdownTable({
                headers: [{ title: '最新发布', align: 'center' }],
                rows: [['zxfb']],
            });

            expect(firstTableShape(markdown)).toEqual(firstTableShape(ZXFB_12371_DESCRIPTION));
        });

        it('matches the theblockbeats description with two tables', () => {
            const markdown = [
                renderMarkdownTable({
                    headers: [
                        { title: '快讯', align: 'center' },
                        { title: '文章', align: 'center' },
                    ],
                    rows: [['newsflash', 'article']],
                }),
                renderMarkdownTable({
                    headers: [
                        { title: '全部', align: 'center' },
                        { title: '深度', align: 'center' },
                        { title: '精选', align: 'center' },
                        { title: '热点追踪', align: 'center' },
                    ],
                    rows: [['0', '1', '2', '3']],
                }),
            ].join('\n\n');

            const migrated = parseTables(markdown);
            const original = parseTables(THEBLOCKBEATS_DESCRIPTION);

            expect(migrated).toHaveLength(2);
            expect(migrated.map((table) => tableShape(table))).toEqual(original.map((table) => tableShape(table)));
        });
    });
});
