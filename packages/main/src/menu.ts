import { Menu, BrowserWindow, dialog } from "electron";
import { basename } from "path";
import { IpcChannel, type AppSettings } from "@wnote/contracts";
import { getRecentFiles, clearRecentFiles } from "./recent-files";
import { saveSettings, loadSettings } from "./settings";
import { windowManager } from "./window-manager";
import { openFileInWindow as sendFileToWindow } from "./open-file";

const labels = {
  zh: {
    settings: "设置",
    file: "文件",
    newFile: "新建文件",
    newWindow: "新建窗口",
    closeTab: "关闭标签",
    openFile: "打开文件",
    save: "保存",
    saveAs: "另存为",
    exportHtml: "导出为 HTML",
    exportPdf: "导出为 PDF",
    autoSave: "自动保存",
    recentFiles: "最近打开",
    clearRecent: "清除记录",
    noRecent: "无记录",
    edit: "编辑",
    format: "格式",
    bold: "粗体",
    italic: "斜体",
    strikethrough: "删除线",
    inlineCode: "行内代码",
    math: "数学公式",
    link: "链接",
    image: "图片",
    codeBlock: "代码块",
    blockquote: "引用",
    unorderedList: "无序列表",
    orderedList: "有序列表",
    taskList: "任务列表",
    horizontalRule: "水平线",
    heading1: "标题 1",
    heading2: "标题 2",
    heading3: "标题 3",
    heading4: "标题 4",
    heading5: "标题 5",
    heading6: "标题 6",
    headingClear: "清除标题",
    view: "视图",
    toggleLeftSidebar: "切换左侧栏",
    hide: "隐藏 WNote",
    hideOthers: "隐藏其他",
    unhide: "显示全部",
    quit: "退出",
    close: "关闭窗口",
    undo: "撤销",
    redo: "重做",
    cut: "剪切",
    copy: "复制",
    paste: "粘贴",
    selectAll: "全选",
    reload: "重新加载",
    zoomIn: "放大",
    zoomOut: "缩小",
    resetZoom: "重置缩放",
    fullscreen: "全屏",
  },
  en: {
    settings: "Settings",
    file: "File",
    newFile: "New File",
    newWindow: "New Window",
    closeTab: "Close Tab",
    openFile: "Open File",
    save: "Save",
    saveAs: "Save As",
    exportHtml: "Export as HTML",
    exportPdf: "Export as PDF",
    autoSave: "Auto Save",
    recentFiles: "Recent Files",
    clearRecent: "Clear Recent",
    noRecent: "No Recent Files",
    edit: "Edit",
    format: "Format",
    bold: "Bold",
    italic: "Italic",
    strikethrough: "Strikethrough",
    inlineCode: "Inline Code",
    math: "Math",
    link: "Link",
    image: "Image",
    codeBlock: "Code Block",
    blockquote: "Blockquote",
    unorderedList: "Unordered List",
    orderedList: "Ordered List",
    taskList: "Task List",
    horizontalRule: "Horizontal Rule",
    heading1: "Heading 1",
    heading2: "Heading 2",
    heading3: "Heading 3",
    heading4: "Heading 4",
    heading5: "Heading 5",
    heading6: "Heading 6",
    headingClear: "Clear Heading",
    view: "View",
    toggleLeftSidebar: "Toggle Left Sidebar",
    hide: "Hide WNote",
    hideOthers: "Hide Others",
    unhide: "Show All",
    quit: "Quit",
    close: "Close Window",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    selectAll: "Select All",
    reload: "Reload",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetZoom: "Reset Zoom",
    fullscreen: "Fullscreen",
  },
};
async function openFileInWindow(win: BrowserWindow) {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return;
  const filePath = result.filePaths[0];
  await sendFileToWindow(win, filePath);
  const settings = await loadSettings();
  createAppMenu(win, settings);
}

export function createAppMenu(win: BrowserWindow, settings: AppSettings) {
  const l = labels[settings.locale] ?? labels.zh;
  const recentFiles = getRecentFiles();

  const recentSubmenu =
    recentFiles.length > 0
      ? [
          ...recentFiles.map((f) => ({
            label: basename(f.path),
            click: async () => {
              await sendFileToWindow(win, f.path);
              const s = await loadSettings();
              createAppMenu(win, s);
            },
          })),
          { type: "separator" as const },
          {
            label: l.clearRecent,
            click: async () => {
              clearRecentFiles();
              const s = await loadSettings();
              createAppMenu(win, s);
            },
          },
        ]
      : [{ label: l.noRecent, enabled: false }];

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin"
      ? [
          {
            label: "WNote",
            submenu: [
              {
                label: l.settings,
                accelerator: "CmdOrCtrl+,",
                click: () => win.webContents.send(IpcChannel.Navigate, "settings"),
              },
              { type: "separator" as const },
              { role: "hide" as const, label: l.hide },
              { role: "hideOthers" as const, label: l.hideOthers },
              { role: "unhide" as const, label: l.unhide },
              { type: "separator" as const },
              { role: "quit" as const, label: l.quit },
            ],
          },
        ]
      : []),
    {
      label: l.file,
      submenu: [
        {
          label: l.newFile,
          accelerator: "CmdOrCtrl+N",
          click: () => win.webContents.send(IpcChannel.FileNew),
        },
        {
          label: l.newWindow,
          accelerator: "CmdOrCtrl+Shift+N",
          click: async () => {
            const s = await loadSettings();
            const newWin = windowManager.create({ isNew: true });
            createAppMenu(newWin, s);
          },
        },
        { type: "separator" as const },
        {
          label: l.openFile,
          accelerator: "CmdOrCtrl+O",
          click: () => openFileInWindow(win),
        },
        { label: l.recentFiles, submenu: recentSubmenu },
        { type: "separator" as const },
        {
          label: l.save,
          accelerator: "CmdOrCtrl+S",
          click: () => win.webContents.send(IpcChannel.FileSaveTrigger),
        },
        {
          label: l.saveAs,
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => win.webContents.send(IpcChannel.FileSaveAsTrigger),
        },
        {
          label: l.exportHtml,
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => win.webContents.send(IpcChannel.ExportHtmlTrigger),
        },
        {
          label: l.exportPdf,
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => win.webContents.send(IpcChannel.ExportPdfTrigger),
        },
        { type: "separator" as const },
        {
          label: l.autoSave,
          type: "checkbox" as const,
          checked: settings.autoSave,
          click: async (menuItem: Electron.MenuItem) => {
            const s = await saveSettings({ autoSave: menuItem.checked });
            for (const w of windowManager.getAll()) {
              w.webContents.send(IpcChannel.SettingsChanged, s);
            }
          },
        },
        { type: "separator" as const },
        {
          label: l.closeTab,
          accelerator: "CmdOrCtrl+W",
          click: () => win.webContents.send(IpcChannel.FileClose),
        },
        ...(process.platform !== "darwin"
          ? [{ type: "separator" as const }, { role: "quit" as const, label: l.quit }]
          : []),
      ],
    },
    {
      label: l.edit,
      submenu: [
        { role: "undo" as const, label: l.undo },
        { role: "redo" as const, label: l.redo },
        { type: "separator" as const },
        { role: "cut" as const, label: l.cut },
        { role: "copy" as const, label: l.copy },
        { role: "paste" as const, label: l.paste },
        { role: "selectAll" as const, label: l.selectAll },
      ],
    },
    {
      label: l.format,
      submenu: [
        {
          label: l.bold,
          accelerator: "CmdOrCtrl+B",
          click: () => win.webContents.send(IpcChannel.FormatBold),
        },
        {
          label: l.italic,
          accelerator: "CmdOrCtrl+I",
          click: () => win.webContents.send(IpcChannel.FormatItalic),
        },
        {
          label: l.strikethrough,
          accelerator: "CmdOrCtrl+Shift+X",
          click: () => win.webContents.send(IpcChannel.FormatStrikethrough),
        },
        {
          label: l.inlineCode,
          accelerator: "CmdOrCtrl+E",
          click: () => win.webContents.send(IpcChannel.FormatInlineCode),
        },
        {
          label: l.math,
          accelerator: "CmdOrCtrl+M",
          click: () => win.webContents.send(IpcChannel.FormatMath),
        },
        { type: "separator" as const },
        {
          label: l.link,
          click: () => win.webContents.send(IpcChannel.FormatLink),
        },
        {
          label: l.image,
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => win.webContents.send(IpcChannel.FormatImage),
        },
        { type: "separator" as const },
        {
          label: l.codeBlock,
          accelerator: "CmdOrCtrl+Shift+K",
          click: () => win.webContents.send(IpcChannel.FormatCodeBlock),
        },
        {
          label: l.blockquote,
          accelerator: "CmdOrCtrl+Shift+B",
          click: () => win.webContents.send(IpcChannel.FormatBlockquote),
        },
        {
          label: l.unorderedList,
          accelerator: "CmdOrCtrl+Shift+U",
          click: () => win.webContents.send(IpcChannel.FormatUnorderedList),
        },
        {
          label: l.orderedList,
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => win.webContents.send(IpcChannel.FormatOrderedList),
        },
        {
          label: l.taskList,
          accelerator: "CmdOrCtrl+Shift+T",
          click: () => win.webContents.send(IpcChannel.FormatTaskList),
        },
        {
          label: l.horizontalRule,
          accelerator: "CmdOrCtrl+Enter",
          click: () => win.webContents.send(IpcChannel.FormatHorizontalRule),
        },
        { type: "separator" as const },
        {
          label: l.heading1,
          accelerator: "CmdOrCtrl+1",
          click: () => win.webContents.send(IpcChannel.FormatHeading1),
        },
        {
          label: l.heading2,
          accelerator: "CmdOrCtrl+2",
          click: () => win.webContents.send(IpcChannel.FormatHeading2),
        },
        {
          label: l.heading3,
          accelerator: "CmdOrCtrl+3",
          click: () => win.webContents.send(IpcChannel.FormatHeading3),
        },
        {
          label: l.heading4,
          accelerator: "CmdOrCtrl+4",
          click: () => win.webContents.send(IpcChannel.FormatHeading4),
        },
        {
          label: l.heading5,
          accelerator: "CmdOrCtrl+5",
          click: () => win.webContents.send(IpcChannel.FormatHeading5),
        },
        {
          label: l.heading6,
          accelerator: "CmdOrCtrl+6",
          click: () => win.webContents.send(IpcChannel.FormatHeading6),
        },
        {
          label: l.headingClear,
          accelerator: "CmdOrCtrl+0",
          click: () => win.webContents.send(IpcChannel.FormatHeadingClear),
        },
      ],
    },
    {
      label: l.view,
      submenu: [
        {
          label: l.toggleLeftSidebar,
          accelerator: "CmdOrCtrl+\\",
          click: () => win.webContents.send(IpcChannel.ToggleSidebar, "left"),
        },
        { type: "separator" as const },
        { role: "reload" as const, label: l.reload },
        { type: "separator" as const },
        { role: "zoomIn" as const, label: l.zoomIn },
        { role: "zoomOut" as const, label: l.zoomOut },
        { role: "resetZoom" as const, label: l.resetZoom },
        { type: "separator" as const },
        { role: "togglefullscreen" as const, label: l.fullscreen },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
