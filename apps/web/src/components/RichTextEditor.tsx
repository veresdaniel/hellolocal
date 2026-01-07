// src/components/RichTextEditor.tsx
import { useRef, useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export function RichTextEditor({ value, onChange, placeholder, height = 300 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Simple textarea for now - can be replaced with TinyMCE later
    // For now, we'll use a styled textarea
  }, []);

  return (
    <textarea
      ref={editorRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        minHeight: height,
        padding: 12,
        fontSize: 16,
        fontFamily: "monospace",
        border: "1px solid #ddd",
        borderRadius: 4,
        resize: "vertical",
      }}
    />
  );
}

