/**
 * Per-folder visual accent (TUI tree icon + label, large folder glyph in preview).
 * Keys are the same as in the file tree, e.g. "notes", "2026", "0-recent" (virtual “recent/”).
 * Unlisted folders use `DEFAULT_FOLDER_ACCENT`.
 */
export const DEFAULT_FOLDER_ACCENT = "#4ec9b0";

export const FOLDER_ACCENT: Record<string, string> = {
	"0-recent": "#c586c0",
	// "notes": "#dcdcaa",
	// "2026": "#7eb6d9",
};

export function accentForFolderKey(key: string): string {
	return FOLDER_ACCENT[key] ?? DEFAULT_FOLDER_ACCENT;
}
