// src/components/TipTapEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect, useState } from "react";

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export function TipTapEditor({ value, onChange, placeholder, height = 300 }: TipTapEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Underline,
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
    setSourceCode(value);
  }, [value, editor]);

  // Handle source code view toggle
  const handleToggleSourceCode = () => {
    if (showSourceCode) {
      // Switching from source code to WYSIWYG
      if (editor) {
        editor.commands.setContent(sourceCode, false);
        onChange(sourceCode);
      }
    } else {
      // Switching from WYSIWYG to source code
      if (editor) {
        setSourceCode(editor.getHTML());
      }
    }
    setShowSourceCode(!showSourceCode);
  };

  // Handle source code changes
  const handleSourceCodeChange = (newSourceCode: string) => {
    setSourceCode(newSourceCode);
    onChange(newSourceCode);
  };

  const handleSetLink = () => {
    if (linkUrl) {
      const { from, to } = editor!.state.selection;
      const selectedText = editor!.state.doc.textBetween(from, to);

      if (selectedText) {
        // If text is selected, make it a link
        editor!.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      } else {
        // If no text selected, insert link with text
        const text = linkText || linkUrl;
        editor!.chain().focus().insertContent(`<a href="${linkUrl}">${text}</a>`).run();
      }
      setShowLinkInput(false);
      setLinkUrl("");
      setLinkText("");
    }
  };

  const handleUnsetLink = () => {
    editor!.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
    setLinkText("");
  };

  const handleLinkButtonClick = () => {
    if (editor!.isActive("link")) {
      const attrs = editor!.getAttributes("link");
      setLinkUrl(attrs.href || "");
      setShowLinkInput(true);
    } else {
      const { from, to } = editor!.state.selection;
      const selectedText = editor!.state.doc.textBetween(from, to);
      setLinkText(selectedText);
      setShowLinkInput(true);
    }
  };

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    title,
    children,
    style,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "6px 10px",
        border: "1px solid #ddd",
        borderRadius: 4,
        background: isActive ? "#007bff" : "white",
        color: isActive ? "white" : "#333",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: 14,
        fontWeight: isActive ? 600 : 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 32,
        transition: "all 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.background = "#f0f0f0";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.background = "white";
        }
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, background: "white", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          borderBottom: "1px solid #ddd",
          padding: "10px 12px",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          background: "#f8f9fa",
          alignItems: "center",
        }}
      >
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <span style={{ textDecoration: "line-through" }}>S</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code"
        >
          <code style={{ fontSize: 12 }}>&lt;/&gt;</code>
        </ToolbarButton>

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive("paragraph")}
          title="Paragraph"
        >
          P
        </ToolbarButton>

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          "
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          &lt;&gt;
        </ToolbarButton>

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Link */}
        {showLinkInput ? (
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              padding: "4px 8px",
              background: "white",
              border: "1px solid #007bff",
              borderRadius: 4,
            }}
          >
            <input
              type="text"
              placeholder="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSetLink();
                } else if (e.key === "Escape") {
                  setShowLinkInput(false);
                  setLinkUrl("");
                  setLinkText("");
                }
              }}
              style={{
                padding: "4px 8px",
                border: "none",
                outline: "none",
                fontSize: 13,
                minWidth: 150,
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSetLink}
              style={{
                padding: "4px 8px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
              title="Set Link"
            >
              ✓
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                onClick={handleUnsetLink}
                style={{
                  padding: "4px 8px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                }}
                title="Remove Link"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
                setLinkText("");
              }}
              style={{
                padding: "4px 8px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <ToolbarButton
            onClick={handleLinkButtonClick}
            isActive={editor.isActive("link")}
            title="Insert/Edit Link (Ctrl+K)"
          >
            🔗
          </ToolbarButton>
        )}

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Other */}
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("Enter image URL:");
            if (url) {
              editor.chain().focus().insertContent(`<img src="${url}" alt="" style="max-width: 100%; height: auto;" />`).run();
            }
          }}
          title="Insert Image"
        >
          🖼️
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          ─
        </ToolbarButton>

        <div style={{ flex: 1 }} />

        {/* Source Code Toggle */}
        <ToolbarButton
          onClick={handleToggleSourceCode}
          isActive={showSourceCode}
          title="Toggle HTML Source Code View"
        >
          &lt;/&gt;
        </ToolbarButton>

        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run() || showSourceCode}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run() || showSourceCode}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div style={{ padding: 12 }}>
        {showSourceCode ? (
          <textarea
            value={sourceCode}
            onChange={(e) => handleSourceCodeChange(e.target.value)}
            placeholder={placeholder || "Enter HTML content..."}
            style={{
              width: "100%",
              minHeight: `${height}px`,
              padding: 12,
              fontSize: 14,
              fontFamily: "'Monaco', 'Courier New', monospace",
              border: "1px solid #ddd",
              borderRadius: 4,
              resize: "vertical",
              lineHeight: 1.5,
              color: "#333",
              background: "#f8f9fa",
            }}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
        <style>{`
          .tiptap-editor {
            outline: none;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 15px;
            color: #333;
            line-height: 1.6;
          }
          .tiptap-editor p {
            margin: 0.5em 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .tiptap-editor p.is-editor-empty:first-child::before {
            color: #999;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .tiptap-editor ul, .tiptap-editor ol {
            padding-left: 1.5em;
            margin: 0.5em 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .tiptap-editor li {
            margin: 0.25em 0;
          }
          .tiptap-editor h1, .tiptap-editor h2, .tiptap-editor h3 {
            margin: 1em 0 0.5em 0;
            font-weight: 600;
            font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .tiptap-editor h1 {
            font-size: 2em;
          }
          .tiptap-editor h2 {
            font-size: 1.5em;
          }
          .tiptap-editor h3 {
            font-size: 1.25em;
          }
          .tiptap-editor blockquote {
            border-left: 3px solid #ddd;
            padding-left: 1em;
            margin: 1em 0;
            color: #666;
            font-style: italic;
          }
          .tiptap-editor code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
          }
          .tiptap-editor pre {
            background: #f4f4f4;
            padding: 1em;
            border-radius: 4px;
            overflow-x: auto;
            margin: 1em 0;
          }
          .tiptap-editor pre code {
            background: none;
            padding: 0;
          }
          .tiptap-editor img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em 0;
            border-radius: 4px;
          }
          .tiptap-editor hr {
            border: none;
            border-top: 2px solid #ddd;
            margin: 1.5em 0;
          }
          .tiptap-link {
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
          }
          .tiptap-link:hover {
            color: #0056b3;
          }
        `}</style>
      </div>
    </div>
  );
}
