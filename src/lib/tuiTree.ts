import type { FlatRow } from "./tree";
import { VIRTUAL_RECENT_DIR } from "./tree";
import { tuiFolderSvg } from "./folderIcons";

export function parentIdOf(row: FlatRow): string {
	if (row.kind === "post") return row.parentKey;
	const j = row.key.lastIndexOf("/");
	if (j === -1) return "";
	return row.key.slice(0, j) || "";
}

export function getParentIndex(r: FlatRow[], i: number): number {
	const d = r[i]!.depth;
	if (d === 0) return -1;
	for (let j = i - 1; j >= 0; j--) {
		if (r[j]!.depth === d - 1) return j;
	}
	return -1;
}

export function isLastSibling(r: FlatRow[], i: number): boolean {
	const p = parentIdOf(r[i]!);
	const d = r[i]!.depth;
	for (let k = i + 1; k < r.length; k++) {
		if (r[k]!.depth < d) return true;
		if (r[k]!.depth === d && parentIdOf(r[k]!) === p) return false;
	}
	return true;
}

function getAncestorChain(r: FlatRow[], i: number): number[] {
	const out: number[] = [];
	let t = getParentIndex(r, i);
	while (t >= 0) {
		out.push(t);
		t = getParentIndex(r, t);
	}
	out.reverse();
	return out;
}

const V = "\u2502";
const H = "\u2500";
const Tmid = "\u251c";
const L = "\u2514";

/** TUI-style: │, ├──, └── */
export function tuiLinePrefix(r: FlatRow[], i: number): string {
	const d = r[i]!.depth;
	if (d === 0) return "";
	const chain = getAncestorChain(r, i);
	let s = "";
	for (let col = 0; col < d - 1; col++) {
		const anc = chain[col]!;
		s += (isLastSibling(r, anc) ? " " : V) + "  ";
	}
	s += (isLastSibling(r, i) ? L : Tmid) + H + H + " ";
	return s;
}

function escHtml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function encDrain(s: string) {
	return s.replace(/&/g, "&amp;");
}

function fileGlyph() {
	return `<span class="tui-file" aria-hidden="true"><span class="tui-file-b">md</span></span>`;
}

function dirIcon(row: FlatRow, expanded: ReadonlySet<string>) {
	const open = row.kind === "dir" && expanded.has(row.key);
	const ico = tuiFolderSvg(open, "tree");
	return `<span class="tui-icowrap">${ico}</span>`;
}

export function rowTuiLineHtml(
	r: FlatRow,
	all: FlatRow[],
	i: number,
	expanded: ReadonlySet<string>,
): string {
	const pfx = tuiLinePrefix(all, i);
	const drain = `<span class="tui-drain" aria-hidden="true">${encDrain(pfx)}</span>`;
	if (r.kind === "dir") {
		const isRecent = r.name === VIRTUAL_RECENT_DIR;
		return (
			`${drain}` +
			`${dirIcon(r, expanded)}` +
			`<span class="tui-line tui-line--dir${isRecent ? " tui-line--recent" : ""}">` +
			`<span class="tree-label">${escHtml(r.displayLabel)}/</span></span>`
		);
	}
	return (
		`${drain}` +
		`${fileGlyph()}` +
		`<span class="tui-line tui-line--post">` +
		`<span class="tree-title">${escHtml(r.title)}</span> <span class="dim tree-date">${escHtml(r.iso)}</span>` +
		`</span>`
	);
}
