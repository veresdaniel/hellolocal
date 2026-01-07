// src/components/TipTapEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export function TipTapEditor({ value, onChange, placeholder, height = 300 }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
        style: `min-height: ${height}px; padding: 12px;`,
      },
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 4, background: "white" }}>
      <div
        style={{
          borderBottom: "1px solid #ddd",
          padding: "8px 12px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          background: "#f8f9fa",
        }}
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          style={{
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: editor.isActive("bold") ? "#007bff" : "white",
            color: editor.isActive("bold") ? "white" : "#333",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
          }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          style={{
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: editor.isActive("italic") ? "#007bff" : "white",
            color: editor.isActive("italic") ? "white" : "#333",
            cursor: "pointer",
            fontSize: 14,
            fontStyle: "italic",
          }}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={{
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: editor.isActive("bulletList") ? "#007bff" : "white",
            color: editor.isActive("bulletList") ? "white" : "#333",
            cursor: "pointer",
            fontSize: 16,
          }}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          style={{
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: editor.isActive("orderedList") ? "#007bff" : "white",
            color: editor.isActive("orderedList") ? "white" : "#333",
            cursor: "pointer",
            fontSize: 14,
          }}
          title="Numbered List"
        >
          1.
        </button>
        <div style={{ width: 1, background: "#ddd", margin: "0 4px" }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          style={{
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: "white",
            cursor: editor.can().chain().focus().undo().run() ? "pointer" : "not-allowed",
            opacity: editor.can().chain().focus().undo().run() ? 1 : 0.5,
            fontSize: 16,
          }}
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          style={{
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: "white",
            cursor: editor.can().chain().focus().redo().run() ? "pointer" : "not-allowed",
            opacity: editor.can().chain().focus().redo().run() ? 1 : 0.5,
            fontSize: 16,
          }}
          title="Redo"
        >
          ↷
        </button>
      </div>
      <div style={{ padding: 12 }}>
        <EditorContent editor={editor} />
        <style>{`
          .tiptap-editor {
            outline: none;
          }
          .tiptap-editor p {
            margin: 0.5em 0;
          }
          .tiptap-editor p.is-editor-empty:first-child::before {
            color: #adb5bd;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
          .tiptap-editor ul, .tiptap-editor ol {
            padding-left: 1.5em;
            margin: 0.5em 0;
          }
        `}</style>
      </div>
    </div>
  );
}

