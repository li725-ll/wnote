import { Facet } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type ImageSaveHandler = (file: File) => Promise<string | null>;

export const imageSaveHandlerFacet = Facet.define<ImageSaveHandler, ImageSaveHandler | null>({
  combine: (values) => values[0] ?? null,
});

function getImageFile(dataTransfer: DataTransfer | null): File | null {
  if (!dataTransfer) return null;
  for (const item of dataTransfer.files) {
    if (item.type.startsWith("image/")) return item;
  }
  return null;
}

async function handleImageInsert(view: EditorView, file: File, pos?: number) {
  const handler = view.state.facet(imageSaveHandlerFacet);
  if (!handler) return false;

  const savedPath = await handler(file);
  if (!savedPath) return false;

  const insertPos = pos ?? view.state.selection.main.head;
  const insert = `![](${savedPath})\n`;
  view.dispatch({
    changes: { from: insertPos, insert },
    selection: { anchor: insertPos + insert.length },
  });
  return true;
}

export function imagePaste(handler: ImageSaveHandler) {
  return [
    imageSaveHandlerFacet.of(handler),
    EditorView.domEventHandlers({
      paste(event, view) {
        const file = getImageFile(event.clipboardData);
        if (!file) return false;
        event.preventDefault();
        handleImageInsert(view, file);
        return true;
      },
      drop(event, view) {
        const file = getImageFile(event.dataTransfer);
        if (!file) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        handleImageInsert(view, file, pos ?? undefined);
        return true;
      },
    }),
  ];
}
