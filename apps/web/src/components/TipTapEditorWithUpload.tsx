/**
 * TipTap Editor with integrated file upload support
 * Supports both image and video uploads via configurable CDN service
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";
import { useEffect, useState, useRef } from "react";
import { uploadService } from "../services/upload/uploadService";

interface TipTapEditorWithUploadProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  /**
   * Folder path for uploaded files (e.g., "editor/places", "editor/events")
   */
  uploadFolder?: string;
  /**
   * Enable video uploads (default: false)
   */
  enableVideo?: boolean;
}

export function TipTapEditorWithUpload({
  value,
  onChange,
  placeholder,
  height = 300,
  uploadFolder = "editor",
  enableVideo = false,
}: TipTapEditorWithUploadProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
      Image.configure({
        inline: false,
        allowBase64: false, // We use CDN URLs instead of base64
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      ImageResize,
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
      if (editor) {
        editor.commands.setContent(sourceCode, false);
        onChange(sourceCode);
      }
    } else {
      if (editor) {
        setSourceCode(editor.getHTML());
      }
    }
    setShowSourceCode(!showSourceCode);
  };

  const handleSourceCodeChange = (newSourceCode: string) => {
    setSourceCode(newSourceCode);
    onChange(newSourceCode);
  };

  const handleFileSelect = async (
    file: File,
    isVideo: boolean = false
  ) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let url: string;
      
      if (isVideo) {
        url = await uploadService.uploadVideo(file, {
          folder: uploadFolder,
          onProgress: setUploadProgress,
        });
        
        // Insert video as HTML (TipTap doesn't have native video extension)
        const videoHtml = `<video controls style="max-width: 100%; height: auto; display: block; margin: 16px auto;"><source src="${url}" type="video/${file.type.split('/')[1] || 'mp4'}"></video>`;
        editor?.commands.insertContent(videoHtml);
      } else {
        url = await uploadService.uploadImage(file, {
          folder: uploadFolder,
          onProgress: setUploadProgress,
        });
        
        editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const handleSetLink = () => {
    if (linkUrl) {
      const { from, to } = editor!.state.selection;
      const selectedText = editor!.state.doc.textBetween(from, to);

      if (selectedText) {
        editor!.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      } else {
        editor!.chain().focus().insertContent(`<a href="${linkUrl}">${linkText || linkUrl}</a>`).run();
      }
      setShowLinkInput(false);
      setLinkUrl("");
      setLinkText("");
    }
  };

  const handleLinkButtonClick = () => {
    const { from, to } = editor!.state.selection;
    const selectedText = editor!.state.doc.textBetween(from, to);
    const link = editor!.getAttributes("link");

    if (link.href) {
      setLinkUrl(link.href);
      setLinkText(selectedText || "");
    } else if (selectedText) {
      setLinkText(selectedText);
    }

    setShowLinkInput(true);
  };

  const handleUnsetLink = () => {
    editor!.chain().focus().unsetLink().run();
  };

  if (showSourceCode) {
    return (
      <div style={{ border: "1px solid #ddd", borderRadius: 4 }}>
        <div
          style={{
            padding: 8,
            background: "#f5f5f5",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600 }}>HTML Source</span>
          <button
            type="button"
            onClick={handleToggleSourceCode}
            style={{
              padding: "4px 8px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {showSourceCode ? "Show Editor" : "Show Source"}
          </button>
        </div>
        <textarea
          value={sourceCode}
          onChange={(e) => handleSourceCodeChange(e.target.value)}
          style={{
            width: "100%",
            minHeight: `${height}px`,
            padding: 12,
            border: "none",
            fontFamily: "monospace",
            fontSize: 13,
            resize: "vertical",
          }}
          placeholder="HTML source code..."
        />
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 4 }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file, false);
        }}
      />
      {enableVideo && (
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file, true);
          }}
        />
      )}

      {/* Toolbar */}
      <div
        style={{
          padding: 8,
          background: "#f5f5f5",
          borderBottom: "1px solid #ddd",
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          alignItems: "center",
        }}
      >
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </ToolbarButton>

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
          title="Bullet List"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive("orderedList")}
          title="Numbered List"
        >
          1.
        </ToolbarButton>

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Link */}
        {showLinkInput ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSetLink();
                }
              }}
              style={{
                padding: "4px 8px",
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 12,
                minWidth: 200,
              }}
            />
            {!editor?.state.selection.empty && (
              <input
                type="text"
                placeholder="Link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 12,
                  minWidth: 150,
                }}
              />
            )}
            <button
              type="button"
              onClick={handleSetLink}
              style={{
                padding: "4px 8px",
                background: "#667eea",
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
            {editor?.isActive("link") && (
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
            isActive={editor?.isActive("link")}
            title="Insert/Edit Link (Ctrl+K)"
          >
            🔗
          </ToolbarButton>
        )}

        <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />

        {/* Media Upload */}
        <ToolbarButton
          onClick={handleImageUpload}
          disabled={isUploading}
          title="Upload Image"
        >
          {isUploading ? "⏳" : "🖼️"}
        </ToolbarButton>
        
        {enableVideo && (
          <ToolbarButton
            onClick={handleVideoUpload}
            disabled={isUploading}
            title="Upload Video"
          >
            🎥
          </ToolbarButton>
        )}

        {/* Upload Progress */}
        {isUploading && uploadProgress > 0 && (
          <div style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>
            {uploadProgress}%
          </div>
        )}

        {/* Image Formatting */}
        {editor?.isActive("image") && (
          <>
            <div style={{ width: 1, background: "#ddd", margin: "0 4px", height: 24 }} />
            <ToolbarButton
              onClick={() => {
                const attrs = editor.getAttributes("image");
                editor.chain().focus().setImage({ ...attrs, style: "float: left; margin: 0 16px 16px 0; max-width: 50%;" }).run();
              }}
              title="Align Left"
            >
              ⬅️
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const attrs = editor.getAttributes("image");
                editor.chain().focus().setImage({ ...attrs, style: "display: block; margin: 0 auto; max-width: 100%;" }).run();
              }}
              title="Align Center"
            >
              ⬆️
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const attrs = editor.getAttributes("image");
                editor.chain().focus().setImage({ ...attrs, style: "float: right; margin: 0 0 16px 16px; max-width: 50%;" }).run();
              }}
              title="Align Right"
            >
              ➡️
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                editor.chain().focus().deleteSelection().run();
              }}
              title="Delete Image"
            >
              🗑️
            </ToolbarButton>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Source Code Toggle */}
        <ToolbarButton
          onClick={handleToggleSourceCode}
          title="Toggle HTML Source Code View"
        >
          &lt;/&gt;
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Styles */}
      <style>{`
        .tiptap-editor {
          outline: none;
        }
        .tiptap-editor img.tiptap-image {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px auto;
        }
        .tiptap-editor video {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px auto;
        }
        .resize-handle {
          background: #667eea;
          border: 2px solid white;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          position: absolute;
          cursor: nwse-resize;
        }
      `}</style>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "4px 8px",
        background: isActive ? "#667eea" : disabled ? "#ccc" : "white",
        color: isActive || disabled ? "white" : "#333",
        border: "1px solid #ddd",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 14,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
