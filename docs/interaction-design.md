# WNote Interaction Design

WNote is designed for focused writing. The interface should keep attention on the document, make common actions available from the keyboard, and reveal navigation only when it helps the current writing flow.

## Principles

- Keep the editor as the primary surface. Persistent controls should be minimal and visually quiet.
- Prefer keyboard-first workflows for frequent actions, so users do not need to leave the writing position.
- Reveal navigation and document management on demand instead of keeping them permanently prominent.
- Preserve familiar Markdown habits: direct Markdown typing, slash commands, and standard formatting shortcuts should remain available.
- Avoid turning the editor into a dashboard. Supporting UI should help orientation without competing with the text.

## Current Interaction Model

- The document outline is collapsed by default for new layouts. Users can toggle it when structural navigation is needed.
- The top tab bar is hidden during writing and appears when the pointer reaches the top edge.
- `Cmd/Ctrl+K` opens the command palette as the main keyboard entry for file, view, and formatting actions.
- `Cmd/Ctrl+\` toggles the outline quickly without opening menus.
- Existing Markdown input, slash commands, context menu, and menu actions remain available.

## Command Palette Scope

The command palette should stay lightweight. Its first responsibility is to expose core writing commands:

- File actions: new document, open file, save, save as.
- View actions: show or hide the document outline.
- Formatting actions: headings, bold, italic, strikethrough, links, inline code, code blocks, blockquotes, lists, task lists, dividers, images, and math.

The palette should return focus to the editor after executing a command. It should not become a full project launcher or search surface until that need is clear.

## Visual Direction

- Use restrained borders, subtle hover states, and compact controls.
- Keep panels and floating UI small, predictable, and easy to dismiss.
- Do not add persistent toolbars for actions already available through Markdown, shortcuts, slash commands, or the command palette.
- Make temporary UI appear close to the action context or in a consistent global location.

## Future Considerations

- Add recent-file switching to the command palette only if multi-document usage becomes frequent.
- Add a dedicated focus mode only if default immersive behavior is not enough.
- Consider localized command labels if command palette usage expands beyond the core Chinese UI.
