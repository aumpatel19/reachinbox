"use client";

import { useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  AlignLeft,
} from "lucide-react";

export interface RichTextEditorProps {
  onChange: (html: string) => void;
  placeholder?: string;
}

const toolbarButtons: { icon: typeof Bold; command: string; value?: string; label: string }[] = [
  { icon: Undo2, command: "undo", label: "Undo" },
  { icon: Redo2, command: "redo", label: "Redo" },
  { icon: Bold, command: "bold", label: "Bold" },
  { icon: Italic, command: "italic", label: "Italic" },
  { icon: Underline, command: "underline", label: "Underline" },
  { icon: AlignLeft, command: "justifyLeft", label: "Align left" },
  { icon: ListOrdered, command: "insertOrderedList", label: "Numbered list" },
  { icon: List, command: "insertUnorderedList", label: "Bulleted list" },
  { icon: Indent, command: "indent", label: "Indent" },
  { icon: Outdent, command: "outdent", label: "Outdent" },
  { icon: Quote, command: "formatBlock", value: "blockquote", label: "Quote" },
  { icon: Strikethrough, command: "strikeThrough", label: "Strikethrough" },
];

export function RichTextEditor({ onChange, placeholder = "Type Your Reply..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  function exec(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-zinc-50">
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[220px] flex-1 px-6 py-5 text-sm text-zinc-800 outline-none empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)]"
      />
      <div className="flex flex-wrap items-center gap-1 border-t border-zinc-200 px-4 py-2">
        {toolbarButtons.map(({ icon: Icon, command, value: cmdValue, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(command, cmdValue);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-800"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
