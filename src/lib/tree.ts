import type { CollectionEntry } from "astro:content";
import { accentForFolderKey } from "../config/folderTheme";

/** Virtual “recent” folder; sort key is `0-recent` so it stays first and avoids clashing with `content/blog/recent/`. */
export const VIRTUAL_RECENT_DIR = "0-recent";

/** Shown first in the browse tree at repo root (file may live under a folder in `content/blog/`). */
export const PINNED_HOME_POST_ID = "welcome";

type Dir = {
  dirs: Map<string, Dir>;
  posts: Array<{
    segment: string;
    id: string;
    title: string;
    iso: string;
  }>;
};

/**
 * Removes a post from wherever it sits in the tree and prepends it to `root.posts` so the UI can show it at the top.
 */
export function pinPostToTreeRoot(root: Dir, postId: string): boolean {
  function findAndRemove(d: Dir): Dir["posts"][number] | null {
    for (let i = 0; i < d.posts.length; i++) {
      if (d.posts[i]!.id === postId) {
        const [removed] = d.posts.splice(i, 1);
        return removed!;
      }
    }
    for (const sub of d.dirs.values()) {
      const found = findAndRemove(sub);
      if (found) return found;
    }
    return null;
  }
  const post = findAndRemove(root);
  if (!post) return false;
  root.posts.unshift(post);
  return true;
}

/**
 * Injects a folder of the 3 most recent posts (by date) at the root, shown as `recent/`.
 * See {@link VIRTUAL_RECENT_DIR}.
 */
export function injectVirtualRecentFolder(
  root: Dir,
  threeMostRecent: Array<CollectionEntry<"blog">>,
): void {
  const postRows = threeMostRecent.map((e) => {
    const parts = e.id.split("/").filter(Boolean);
    const file = parts[parts.length - 1] ?? e.id;
    return {
      segment: file,
      id: e.id,
      title: e.data.title,
      iso: (e.data.date as Date).toISOString().slice(0, 10),
    };
  });
  root.dirs.set(VIRTUAL_RECENT_DIR, { dirs: new Map(), posts: postRows });
  /* Map insertion would leave `0-recent` last; always pin to top */
  reorderRootRecentFirst(root);
}

function reorderRootRecentFirst(root: Dir): void {
  const recent = root.dirs.get(VIRTUAL_RECENT_DIR);
  if (!recent) return;
  const rest: [string, Dir][] = [];
  for (const [k, v] of root.dirs) {
    if (k !== VIRTUAL_RECENT_DIR) rest.push([k, v]);
  }
  rest.sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }));
  root.dirs = new Map<string, Dir>([[VIRTUAL_RECENT_DIR, recent], ...rest]);
}

export function buildDirRoot(entries: Array<CollectionEntry<"blog">>): Dir {
  const root: Dir = { dirs: new Map(), posts: [] };
  for (const e of entries) {
    if (e.data.draft) continue;
    const parts = e.id.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let d = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i]!;
      if (!d.dirs.has(name)) d.dirs.set(name, { dirs: new Map(), posts: [] });
      d = d.dirs.get(name)!;
    }
    const file = parts[parts.length - 1]!;
    d.posts.push({
      segment: file,
      id: e.id,
      title: e.data.title,
      iso: (e.data.date as Date).toISOString().slice(0, 10),
    });
  }
  sortDir(root);
  return root;
}

function sortDir(d: Dir): void {
  d.posts.sort((a, b) => a.segment.localeCompare(b.segment, undefined, { sensitivity: "base" }));
  for (const sub of d.dirs.values()) sortDir(sub);
  const names = Array.from(d.dirs.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const m = new Map<string, Dir>();
  for (const n of names) m.set(n, d.dirs.get(n)!);
  d.dirs = m;
}

export type FlatRow =
  | { kind: "dir"; name: string; key: string; depth: number; displayLabel: string }
  | { kind: "post"; title: string; id: string; depth: number; iso: string; parentKey: string };

export function flatten(root: Dir, expanded: ReadonlySet<string>, keyPrefix: string, rowDepth: number): FlatRow[] {
  const out: FlatRow[] = [];
  const atRepoRoot = keyPrefix === "" && rowDepth === 0;

  function pushPostsHere(): void {
    for (const p of root.posts) {
      out.push({
        kind: "post",
        title: p.title,
        id: p.id,
        depth: rowDepth,
        iso: p.iso,
        parentKey: keyPrefix,
      });
    }
  }

  if (atRepoRoot) {
    pushPostsHere();
  }

  for (const name of root.dirs.keys()) {
    const key = keyPrefix ? `${keyPrefix}/${name}` : name;
    const displayLabel = name === VIRTUAL_RECENT_DIR ? "recent" : name;
    out.push({ kind: "dir", name, key, depth: rowDepth, displayLabel });
    if (expanded.has(key)) {
      out.push(...flatten(root.dirs.get(name)!, expanded, key, rowDepth + 1));
    }
  }

  if (!atRepoRoot) {
    pushPostsHere();
  }

  return out;
}

export function allDirKeys(d: Dir, keyPrefix: string = ""): string[] {
  const acc: string[] = [];
  for (const name of d.dirs.keys()) {
    const key = keyPrefix ? `${keyPrefix}/${name}` : name;
    acc.push(key, ...allDirKeys(d.dirs.get(name)!, key));
  }
  return acc;
}

export function allExpandedState(d: Dir): Set<string> {
  return new Set(allDirKeys(d));
}

/** JSON-safe tree (directory order preserved). */
export type SerDir = { sub: [string, SerDir][]; posts: Dir["posts"] };

export function serializeDir(d: Dir): SerDir {
  return {
    sub: Array.from(d.dirs.entries()).map(([k, v]) => [k, serializeDir(v)] as [string, SerDir]),
    posts: d.posts,
  };
}

export function deserializeDir(s: SerDir): Dir {
  return {
    dirs: new Map(s.sub.map(([k, v]) => [k, deserializeDir(v)])),
    posts: s.posts,
  };
}

export type FolderPreviewInfo = { count: number; blurb: string; displayLabel: string; accentColor: string };

function countPostsInSubTree(d: Dir): number {
  let n = d.posts.length;
  for (const c of d.dirs.values()) n += countPostsInSubTree(c);
  return n;
}

export function buildFolderPreviewMeta(root: Dir): Record<string, FolderPreviewInfo> {
  const out: Record<string, FolderPreviewInfo> = {};
  function walk(d: Dir, keyPrefix: string): void {
    for (const [name, sub] of d.dirs) {
      const key = keyPrefix ? `${keyPrefix}/${name}` : name;
      const count = countPostsInSubTree(sub);
      const displayLabel = name === VIRTUAL_RECENT_DIR ? "recent" : name;
      const blurb =
        name === VIRTUAL_RECENT_DIR
          ? "my most recent dumps"
          : `Posts under the “${name}/” path in the blog tree. ${count} total dump${count === 1 ? "" : "s"} below this point.`;
      out[key] = { count, blurb, displayLabel, accentColor: accentForFolderKey(key) };
      walk(sub, key);
    }
  }
  walk(root, "");
  return out;
}
