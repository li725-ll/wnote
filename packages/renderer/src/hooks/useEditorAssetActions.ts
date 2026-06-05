import { useCallback, type RefObject } from "react";
import {
  IpcChannel,
  type AssetIndex,
  type AssetRef,
  type AssetReference,
  type DeleteAssetResult,
  type DeleteManyAssetsResult,
} from "@wnote/contracts";
import type { EditorRef } from "@wnote/editor-react";
import {
  canRelocateDocumentAsset,
  getAssetRelocateBlockedMessage,
  getUnusedAssetDeleteAllConfirmMessage,
  getUnusedAssetDeleteConfirmMessage,
  getUnusedAssetDeleteFailureMessage,
  relocateDocumentAssetReference,
  removeDocumentAssetReference,
  resolveDocumentAssetPreview,
} from "../assets/asset-state";
import type { DocumentTab } from "./useTabs";

export function useEditorAssetActions({
  editorRef,
  getCurrentTab,
  getEditorContent,
  onContentChange,
  onAssetsChange,
}: {
  editorRef: RefObject<EditorRef | null>;
  getCurrentTab(): Pick<DocumentTab, "path" | "assets">;
  getEditorContent(): Promise<string>;
  onContentChange(content: string): void;
  onAssetsChange(assets?: AssetIndex): void;
}) {
  const handleImageSave = useCallback(
    async (file: File) => {
      const tab = getCurrentTab();
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop() || "png";
      const asset = await window.electronAPI.invoke<AssetRef | null>(IpcChannel.ImageSave, {
        buffer,
        ext,
        documentPath: tab.path,
        originalName: file.name,
        mime: file.type,
      });
      return asset ? { src: asset.markdownPath, previewSrc: asset.url } : null;
    },
    [getCurrentTab],
  );

  const resolveEditorAsset = useCallback(
    (src: string) => {
      const tab = getCurrentTab();
      return resolveDocumentAssetPreview(src, tab.assets, tab.path);
    },
    [getCurrentTab],
  );

  const handleResourceClick = useCallback(
    (reference: AssetReference) => {
      editorRef.current?.scrollToPos(reference.position);
      editorRef.current?.focus();
    },
    [editorRef],
  );

  const handleResourceDelete = useCallback(
    async (reference: AssetReference) => {
      const current = await getEditorContent();
      const next = removeDocumentAssetReference(current, reference);
      if (!next) return;
      editorRef.current?.setContent(next);
      onContentChange(next);
      editorRef.current?.focus();
    },
    [editorRef, getEditorContent, onContentChange],
  );

  const handleResourceRelocate = useCallback(
    async (reference: AssetReference) => {
      const documentPath = getCurrentTab().path;
      if (!canRelocateDocumentAsset(documentPath)) {
        window.alert(getAssetRelocateBlockedMessage());
        return;
      }
      const asset = await window.electronAPI.invoke<AssetRef | null>(IpcChannel.AssetImport, {
        documentPath,
      });
      if (!asset) return;
      const current = await getEditorContent();
      const next = relocateDocumentAssetReference(current, reference, asset.markdownPath);
      if (!next) return;
      editorRef.current?.setContent(next);
      onContentChange(next);
      editorRef.current?.focus();
    },
    [editorRef, getCurrentTab, getEditorContent, onContentChange],
  );

  const handleUnusedDelete = useCallback(
    async (asset: AssetRef) => {
      const tab = getCurrentTab();
      if (!tab.path) return;
      const ok = window.confirm(getUnusedAssetDeleteConfirmMessage(asset.markdownPath));
      if (!ok) return;
      const content = await getEditorContent();
      const result = await window.electronAPI.invoke<DeleteAssetResult>(IpcChannel.AssetDelete, {
        documentPath: tab.path,
        absolutePath: asset.absolutePath,
        content,
      });
      onAssetsChange(result.assets);
    },
    [getCurrentTab, getEditorContent, onAssetsChange],
  );

  const handleUnusedDeleteAll = useCallback(
    async (assets: AssetRef[]) => {
      const tab = getCurrentTab();
      if (!tab.path || assets.length === 0) return;
      const ok = window.confirm(getUnusedAssetDeleteAllConfirmMessage(assets.length));
      if (!ok) return;
      const content = await getEditorContent();
      const result = await window.electronAPI.invoke<DeleteManyAssetsResult>(
        IpcChannel.AssetDeleteMany,
        {
          documentPath: tab.path,
          absolutePaths: assets.map((asset) => asset.absolutePath),
          content,
        },
      );
      onAssetsChange(result.assets);
      if (result.failed.length > 0) {
        window.alert(
          getUnusedAssetDeleteFailureMessage(result.deleted.length, result.failed.length),
        );
      }
    },
    [getCurrentTab, getEditorContent, onAssetsChange],
  );

  return {
    handleImageSave,
    resolveEditorAsset,
    handleResourceClick,
    handleResourceDelete,
    handleResourceRelocate,
    handleUnusedDelete,
    handleUnusedDeleteAll,
  };
}
