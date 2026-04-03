import { createTheme, type CreateThemeOptions } from "@uiw/codemirror-themes"
import { tags as t } from "@lezer/highlight"

const FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace"

const sharedSettings: CreateThemeOptions["settings"] = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  caret: "var(--foreground)",
  selection: "var(--accent)",
  selectionMatch: "var(--accent)",
  lineHighlight: "var(--muted)",
  gutterBackground: "var(--background)",
  gutterForeground: "var(--muted-foreground)",
  gutterBorder: "transparent",
  gutterActiveForeground: "var(--foreground)",
  fontFamily: FONT_FAMILY,
}

function buildStyles(palette: {
  h1: string
  h2: string
  h3: string
  h4: string
  emphasis: string
  strong: string
  link: string
  url: string
  monospace: string
  list: string
  label: string
  keyword: string
  operator: string
  number: string
  variable: string
  fn: string
  type: string
  property: string
}): CreateThemeOptions["styles"] {
  return [
    { tag: t.heading1, color: palette.h1, fontWeight: "700" },
    { tag: t.heading2, color: palette.h2, fontWeight: "600" },
    { tag: t.heading3, color: palette.h3, fontWeight: "600" },
    { tag: [t.heading4, t.heading5, t.heading6], color: palette.h4, fontWeight: "600" },

    { tag: t.emphasis, color: palette.emphasis, fontStyle: "italic" },
    { tag: t.strong, color: palette.strong, fontWeight: "700" },
    { tag: t.strikethrough, textDecoration: "line-through", color: "var(--muted-foreground)" },

    { tag: t.link, color: palette.link, textDecoration: "underline" },
    { tag: t.url, color: palette.url },

    { tag: t.monospace, color: palette.monospace },
    { tag: t.list, color: palette.list },
    { tag: t.quote, color: "var(--muted-foreground)", fontStyle: "italic" },

    { tag: [t.meta, t.processingInstruction], color: "var(--muted-foreground)" },
    { tag: [t.punctuation, t.separator], color: "var(--muted-foreground)" },

    { tag: t.labelName, color: palette.label },
    { tag: t.string, color: palette.monospace },
    { tag: t.comment, color: "var(--muted-foreground)", fontStyle: "italic" },

    { tag: t.keyword, color: palette.keyword },
    { tag: t.operator, color: palette.operator },
    { tag: [t.number, t.bool], color: palette.number },
    { tag: t.variableName, color: palette.variable },
    { tag: t.function(t.variableName), color: palette.fn },
    { tag: t.typeName, color: palette.type },
    { tag: t.propertyName, color: palette.property },
  ]
}

export const anvilTheme = createTheme({
  theme: "dark",
  settings: sharedSettings,
  styles: buildStyles({
    h1: "oklch(0.80 0.16 52)",
    h2: "oklch(0.75 0.14 52)",
    h3: "oklch(0.70 0.12 52)",
    h4: "oklch(0.65 0.10 52)",
    emphasis: "oklch(0.75 0.10 195)",
    strong: "oklch(0.80 0.10 52)",
    link: "oklch(0.70 0.14 250)",
    url: "oklch(0.65 0.12 250)",
    monospace: "oklch(0.75 0.10 160)",
    list: "oklch(0.70 0.10 195)",
    label: "oklch(0.70 0.12 265)",
    keyword: "oklch(0.72 0.14 265)",
    operator: "oklch(0.70 0.10 265)",
    number: "oklch(0.76 0.14 52)",
    variable: "oklch(0.78 0.10 195)",
    fn: "oklch(0.78 0.12 250)",
    type: "oklch(0.76 0.12 52)",
    property: "oklch(0.78 0.10 195)",
  }),
})

export const anvilThemeLight = createTheme({
  theme: "light",
  settings: sharedSettings,
  styles: buildStyles({
    h1: "oklch(0.45 0.16 52)",
    h2: "oklch(0.48 0.14 52)",
    h3: "oklch(0.50 0.12 52)",
    h4: "oklch(0.52 0.10 52)",
    emphasis: "oklch(0.45 0.12 195)",
    strong: "oklch(0.38 0.12 52)",
    link: "oklch(0.50 0.16 250)",
    url: "oklch(0.45 0.14 250)",
    monospace: "oklch(0.42 0.12 160)",
    list: "oklch(0.45 0.12 195)",
    label: "oklch(0.48 0.14 265)",
    keyword: "oklch(0.48 0.16 265)",
    operator: "oklch(0.45 0.12 265)",
    number: "oklch(0.50 0.16 52)",
    variable: "oklch(0.45 0.12 195)",
    fn: "oklch(0.45 0.14 250)",
    type: "oklch(0.50 0.14 52)",
    property: "oklch(0.45 0.12 195)",
  }),
})
