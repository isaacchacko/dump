/** Shared TUI-style folder icons (tree + large preview) — `currentColor` for accent. */
export function tuiFolderSvg(isOpen: boolean, size: "tree" | "panel"): string {
	const dim =
		size === "tree"
			? isOpen
				? { w: "1.1em", h: "1.15em" }
				: { w: "1.05em", h: "1.1em" }
			: { w: "2.75rem", h: "2.8rem" };
	if (!isOpen) {
		return `<svg class="tui-dir-svg" viewBox="0 0 16 16" width="${dim.w}" height="${dim.h}" aria-hidden="true"><path fill="currentColor" d="M2.25 2.5A.75.75 0 0 0 1.5 3.25V4h.75a.75.75 0 0 1 0-1.5H5.1l.65 1H2.5A1.5 1.5 0 0 0 1 5V6.5A1.5 1.5 0 0 0 2.5 8H15V5.5a1 1 0 0 0-1-1H6.2L4.1 1.5H2.5z" opacity="0.95"/><rect x="0.5" y="3.5" width="15" height="7.5" rx="0.4" fill="currentColor" opacity="0.85"/></svg>`;
	}
	return `<svg class="tui-dir-svg tui-dir--open" viewBox="0 0 16 16" width="${dim.w}" height="${dim.h}" aria-hidden="true"><path fill="currentColor" d="M1.5 3.25A.75.75 0 0 0 .8 4v.3l.2.15h.75a.75.75 0 0 1 0-1.5H4.5l.3.6L5.5 5.5H14.5A1.5 1.5 0 0 1 16 7V8H1.5A1.5 1.5 0 0 1 0 6.5V4A1.5 1.5 0 0 1 1.5 2.5H4l1.3 1.7L6.5 4H1.5z" opacity="0.5"/><rect x="0" y="5" width="16" height="8" rx="0.5" fill="currentColor" opacity="0.9"/></svg>`;
}
