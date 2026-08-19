/** Custom event so the empty-state hero CTA can open the sidebar New Document form. */
export const OPEN_NEW_DOCUMENT_EVENT = "brainiac:open-new-document";

export type OpenNewDocumentDetail = {
  mode?: "paste" | "photos";
};

export function openNewDocument(detail: OpenNewDocumentDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_NEW_DOCUMENT_EVENT, { detail }));
}
