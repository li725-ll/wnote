export function domToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const children = Array.from(el.childNodes).map(domToMarkdown).join("");

  switch (el.tagName.toLowerCase()) {
    case "strong":
    case "b":
      return `**${children}**`;
    case "em":
    case "i":
      return `*${children}*`;
    case "del":
    case "s":
      return `~~${children}~~`;
    case "code":
      return `\`${children}\``;
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[${children}](${href})`;
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      return `![${alt}](${src})`;
    }
    case "br":
      return "\n";
    case "div":
    case "p":
      return children + "\n";
    default:
      return children;
  }
}
