import { slashCommandState } from "./state";
import { slashCommandView } from "./view";
import { slashCommandStyles } from "./styles";
import type { Extension } from "@codemirror/state";

export function slashCommands(): Extension {
  return [slashCommandState, slashCommandView, slashCommandStyles];
}
