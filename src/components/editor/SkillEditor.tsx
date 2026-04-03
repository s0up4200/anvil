import CodeMirror from "@uiw/react-codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { EditorView } from "@codemirror/view"
import { search } from "@codemirror/search"
import { lineNumbers } from "@codemirror/view"
import { anvilTheme, anvilThemeLight } from "./editorTheme"

interface SkillEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  theme?: "dark" | "light"
}

const extensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  EditorView.lineWrapping,
  lineNumbers(),
  search({ top: true }),
]

export function SkillEditor({ value, onChange, readOnly = false, theme = "dark" }: SkillEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      readOnly={readOnly}
      theme={theme === "dark" ? anvilTheme : anvilThemeLight}
      basicSetup={{
        lineNumbers: false, // We add lineNumbers() manually above
        foldGutter: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        autocompletion: true,
        searchKeymap: true,
      }}
      className="h-full overflow-auto text-sm"
    />
  )
}
