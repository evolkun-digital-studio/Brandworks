/**
 * Undo/redo for the visual editor. The browser's own undo stack only knows about
 * its own edits, so an image move or resize would corrupt it. Every change goes
 * through these whole-document snapshots instead.
 */

const MAX_ENTRIES = 100

type NodePath = number[]

export interface SelectionSnapshot {
  anchor: NodePath
  anchorOffset: number
  focus: NodePath
  focusOffset: number
}

export interface EditorSnapshot {
  html: string
  selection: SelectionSnapshot | null
  /** Position of the selected image among the document's figures, or -1. */
  image: number
}

export class EditorHistory {
  private past: EditorSnapshot[] = []
  private future: EditorSnapshot[] = []
  private current: EditorSnapshot | null = null

  reset(snapshot: EditorSnapshot) {
    this.past = []
    this.future = []
    this.current = snapshot
  }

  /** Records a new state. Identical content is not a step, only a selection update. */
  commit(snapshot: EditorSnapshot) {
    if (this.current?.html === snapshot.html) {
      this.current = snapshot
      return
    }
    if (this.current) this.past.push(this.current)
    if (this.past.length > MAX_ENTRIES) this.past.shift()
    this.future = []
    this.current = snapshot
  }

  /** Updates the current state without adding a step, such as an upload finishing. */
  replaceCurrent(snapshot: EditorSnapshot) {
    this.current = snapshot
  }

  undo(): EditorSnapshot | null {
    const previous = this.past.pop()
    if (!previous) return null
    if (this.current) this.future.push(this.current)
    this.current = previous
    return previous
  }

  redo(): EditorSnapshot | null {
    const next = this.future.pop()
    if (!next) return null
    if (this.current) this.past.push(this.current)
    this.current = next
    return next
  }

  get hasEdits() {
    return this.past.length > 0
  }
}

function pathTo(node: Node, root: Node): NodePath | null {
  const path: NodePath = []
  let current: Node = node
  while (current !== root) {
    const parent = current.parentNode
    if (!parent) return null
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current))
    current = parent
  }
  return path
}

function nodeAt(path: NodePath, root: Node): Node | null {
  let current: Node | null = root
  for (const index of path) current = current?.childNodes[index] ?? null
  return current
}

export function captureSelection(root: HTMLElement): SelectionSnapshot | null {
  const selection = root.ownerDocument.getSelection()
  if (!selection?.anchorNode || !selection.focusNode || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null
  const anchor = pathTo(selection.anchorNode, root)
  const focus = pathTo(selection.focusNode, root)
  if (!anchor || !focus) return null
  return { anchor, anchorOffset: selection.anchorOffset, focus, focusOffset: selection.focusOffset }
}

function clampOffset(node: Node, offset: number) {
  const size = node.nodeType === 3 ? (node.textContent?.length ?? 0) : node.childNodes.length
  return Math.min(offset, size)
}

export function restoreSelectionSnapshot(root: HTMLElement, snapshot: SelectionSnapshot | null) {
  const selection = root.ownerDocument.getSelection()
  if (!selection || !snapshot) return
  const anchor = nodeAt(snapshot.anchor, root)
  const focus = nodeAt(snapshot.focus, root)
  if (!anchor || !focus) return
  selection.setBaseAndExtent(anchor, clampOffset(anchor, snapshot.anchorOffset), focus, clampOffset(focus, snapshot.focusOffset))
}
