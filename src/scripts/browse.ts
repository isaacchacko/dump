import { tuiFolderSvg } from "../lib/folderIcons";
import { allDirKeys, deserializeDir, flatten, type FlatRow, type FolderPreviewInfo, type SerDir, VIRTUAL_RECENT_DIR } from "../lib/tree";
import { rowTuiLineHtml } from "../lib/tuiTree";

type Payload = {
  base: string;
  root: SerDir;
  folderMeta: Record<string, FolderPreviewInfo>;
  postHtml: Record<string, string>;
};

function parsePayloadB64(b64: string): Payload {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder("utf-8").decode(bytes)) as Payload;
}

function withBase(base: string, path: string, trailing: boolean = true): string {
  const p = path.replace(/^\//, "");
  let s: string;
  if (base === "/") s = `/${p}`;
  else s = `${base.replace(/\/$/, "")}/${p}`;
  if (trailing) return s.endsWith("/") ? s : `${s}/`;
  return s;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

function rowDepthClass(row: FlatRow): string {
  if (row.kind === "dir" && row.name === VIRTUAL_RECENT_DIR) {
    return "is-recent";
  }
  return "";
}

function folderGlyphInPreview(isOpen: boolean): string {
	return `<span class="folder-glyph" aria-hidden="true">${tuiFolderSvg(isOpen, "panel")}</span>`;
}

function renderFolderPreview(
	el: HTMLElement,
	folder: FolderPreviewInfo,
	extraClass: string = "",
	expanded: boolean = false,
) {
	const n = folder.count;
	el.className = "preview-fallback preview-fallback--folder " + extraClass;
	el.style.setProperty("--folder-accent", folder.accentColor);
	el.innerHTML = `<div class="preview-folder-left">
		${folderGlyphInPreview(expanded)}
		<div class="preview-folder-stack">
			<p class="folder-label">${escapeHtml(folder.displayLabel)}/</p>
			<p class="folder-count">${n} dump${n === 1 ? "" : "s"} in this tree</p>
		</div>
	</div>
	<p class="folder-blurb">${escapeHtml(folder.blurb)}</p>`;
}

function renderPostPreview(el: HTMLElement, html: string) {
  el.className = "preview-article";
  el.style.removeProperty("--folder-accent");
  el.innerHTML = html;
  /* read-only: avoid accidental nav */
  el.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("tabindex", "-1");
    (a as HTMLAnchorElement).setAttribute("aria-hidden", "true");
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function scrollSelectedIntoView() {
  const selected = list?.querySelector<HTMLElement>("li.is-selected");
  if (!selected) return;
  selected.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
}

let list: HTMLUListElement | null;

export function boot(mount: HTMLElement, b64: string) {
  const payload = parsePayloadB64(b64);
  const base = payload.base;
  const root = deserializeDir(payload.root);
  const folderMeta = payload.folderMeta;
  const postHtml = payload.postHtml;
  let expanded = new Set<string>(allDirKeys(root));

  list = document.getElementById("browse-rows") as HTMLUListElement | null;
  const titleEl = document.getElementById("browse-title");
  const preview = document.getElementById("browse-preview-inner");
  if (!list || !preview) return;

  let selected = 0;
  /** After j/k (etc.), ignore hover until the pointer actually moves. */
  let keyboardSelectionLock = false;

  function rows(): FlatRow[] {
    return flatten(root, expanded, "", 0);
  }

  function updatePreview() {
    const r = rows();
    const cur = r[selected];
    if (!cur) {
      preview.innerHTML = "";
      preview.style.removeProperty("--folder-accent");
      return;
    }
    if (cur.kind === "dir") {
      const meta = folderMeta[cur.key];
      if (meta) {
        if (cur.name === VIRTUAL_RECENT_DIR) {
          renderFolderPreview(preview, meta, "is-virtual", expanded.has(cur.key));
        } else {
          renderFolderPreview(preview, meta, "", expanded.has(cur.key));
        }
      } else {
        preview.className = "preview-fallback";
        preview.style.removeProperty("--folder-accent");
        preview.textContent = "";
      }
    } else {
      const html = postHtml[cur.id];
      if (html) {
        renderPostPreview(preview, html);
      } else {
        preview.className = "preview-fallback";
        preview.style.removeProperty("--folder-accent");
        preview.innerHTML = "<p>Preview not available.</p>";
      }
    }
  }

  function syncSelectionFromPoint(clientX: number, clientY: number): void {
    const el = document.elementFromPoint(clientX, clientY);
    const liEl = el?.closest?.("li.tree-row");
    if (!liEl || !list!.contains(liEl)) return;
    const idx = Number((liEl as HTMLElement).dataset.index);
    if (Number.isNaN(idx) || idx === selected) return;
    selected = idx;
    render({ focusMount: false, scrollSelection: false });
  }

  function onPointerMoveAfterKeyboard(ev: PointerEvent): void {
    if (!keyboardSelectionLock) return;
    keyboardSelectionLock = false;
    syncSelectionFromPoint(ev.clientX, ev.clientY);
  }

  function render(opts?: { focusMount?: boolean; scrollSelection?: boolean }): void {
    const focusMount = opts?.focusMount ?? true;
    const scrollSelection = opts?.scrollSelection ?? false;
    const r = rows();
    if (selected < 0) selected = 0;
    if (selected >= r.length) selected = Math.max(0, r.length - 1);
    list!.innerHTML = "";
    r.forEach((row, i) => {
      const li = document.createElement("li");
			li.setAttribute("role", "row");
			li.className = [
        "tree-row",
        row.kind === "dir" ? "tree-row--dir" : "tree-row--post",
        i === selected ? "is-selected" : "",
        rowDepthClass(row),
      ]
        .filter(Boolean)
        .join(" ");
			if (row.kind === "dir") {
				const m = folderMeta[row.key];
				if (m) li.style.setProperty("--folder-accent", m.accentColor);
			}
			li.setAttribute("aria-selected", i === selected ? "true" : "false");
			li.innerHTML = rowTuiLineHtml(row, r, i, expanded);
      li.dataset.index = String(i);
      li.addEventListener("pointerenter", () => {
        if (keyboardSelectionLock) return;
        if (i === selected) return;
        selected = i;
        render({ focusMount: false, scrollSelection: false });
      });
      li.addEventListener("click", (e) => {
        keyboardSelectionLock = false;
        if (e.shiftKey) return;
        if (row.kind === "post") {
          if ((e as MouseEvent).metaKey) {
            window.open(withBase(base, row.id), "_blank");
            return;
          }
          window.location.assign(withBase(base, row.id));
          return;
        }
        selected = i;
        render();
      });
      list!.appendChild(li);
    });
    if (titleEl) {
      const cur = r[selected];
      titleEl.textContent =
        cur?.kind === "dir"
          ? `${cur.displayLabel}/`
          : cur?.kind === "post"
            ? cur.title
            : "";
    }
    updatePreview();
    if (scrollSelection) {
      scrollSelectedIntoView();
    }
    if (focusMount) {
      mount.focus({ preventScroll: true });
    }
  }

  function openRow(row: FlatRow | undefined): void {
    if (!row) return;
    if (row.kind === "post") {
      window.location.assign(withBase(base, row.id));
      return;
    }
    if (!expanded.has(row.key)) {
      expanded.add(row.key);
      render();
    }
  }

  function parentKey(row: FlatRow): string | null {
    if (row.kind === "post") return row.parentKey || null;
    const i = row.key.lastIndexOf("/");
    if (i === -1) return null;
    return row.key.slice(0, i) || null;
  }

  function isNavKey(k: string): boolean {
    if (k.length === 1 && "jJkKhHlL".includes(k)) return true;
    if (k === "Enter") return true;
    return /^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(k);
  }

  function shouldIgnoreEnterForOutsideLink(t: EventTarget | null): boolean {
    if (!(t instanceof Node) || !list) return false;
    if (list.contains(t)) return false;
    if (!(t instanceof Element)) return false;
    return Boolean(t.closest("a[href]"));
  }

  function onTreeKeydown(ev: KeyboardEvent): void {
    const k = ev.key;
    if (!isNavKey(k)) return;
    if (isTypingTarget(ev.target)) return;
    if (k === "Enter" && shouldIgnoreEnterForOutsideLink(ev.target)) return;

    const r = rows();
    const cur = r[selected];

    if (k === "j" || k === "J" || k === "ArrowDown") {
      ev.preventDefault();
      ev.stopPropagation();
      keyboardSelectionLock = true;
      if (selected < r.length - 1) {
        selected++;
        render({ scrollSelection: true });
      }
      return;
    }
    if (k === "k" || k === "K" || k === "ArrowUp") {
      ev.preventDefault();
      ev.stopPropagation();
      keyboardSelectionLock = true;
      if (selected > 0) {
        selected--;
        render({ scrollSelection: true });
      }
      return;
    }
    if (k === "l" || k === "L" || k === "ArrowRight" || k === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      keyboardSelectionLock = true;
      openRow(cur);
      return;
    }
    if (k === "h" || k === "H" || k === "ArrowLeft") {
      ev.preventDefault();
      ev.stopPropagation();
      keyboardSelectionLock = true;
      if (!cur) return;
      if (cur.kind === "dir" && expanded.has(cur.key)) {
        expanded.delete(cur.key);
        render();
        return;
      }
      if (cur.kind === "dir" && !expanded.has(cur.key)) {
        const p = parentKey(cur);
        if (p === null) return;
        const idx = r.findIndex((x) => x.kind === "dir" && x.key === p);
        if (idx >= 0) {
          selected = idx;
          render();
        }
        return;
      }
      const p = parentKey(cur);
      if (p === null) return;
      const idx = r.findIndex((x) => x.kind === "dir" && x.key === p);
      if (idx >= 0) {
        selected = idx;
        render();
      }
    }
  }

  window.addEventListener("pointermove", onPointerMoveAfterKeyboard, { passive: true });
  window.addEventListener("keydown", onTreeKeydown, true);
  mount.setAttribute("tabindex", "0");
  render();
}
