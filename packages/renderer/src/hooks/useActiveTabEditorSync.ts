import { useEffect, useRef, type RefObject } from "react";
import type { EditorRef } from "@wnote/editor-react";
import { getDocumentTitle } from "../files/file-state";
import type { DocumentTab } from "./useTabs";

export function useActiveTabEditorSync({
  activeTab,
  activeTabId,
  editorRef,
  setWindowTitle,
}: {
  activeTab: DocumentTab | undefined;
  activeTabId: string;
  editorRef: RefObject<EditorRef | null>;
  setWindowTitle(title: string): void;
}) {
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    const tab = activeTabRef.current;
    if (!tab) return;

    editorRef.current?.setContent(tab.content);
    setWindowTitle(getDocumentTitle(tab.path));
  }, [activeTabId, activeTab?.path, editorRef, setWindowTitle]);
}
