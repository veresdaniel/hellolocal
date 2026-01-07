// src/components/TinyMCEEditor.tsx
import { lazy, Suspense } from "react";

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

// Fallback textarea component
function FallbackEditor({ value, onChange, placeholder, height = 300 }: TinyMCEEditorProps) {
  return (
    <textarea
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

// Lazy load TinyMCE, fallback to textarea if not available
const TinyMCELazy = lazy(async () => {
  try {
    const { Editor } = await import("@tinymce/tinymce-react");
    return { default: Editor };
  } catch (e) {
    // Return fallback if TinyMCE is not installed
    return { default: FallbackEditor };
  }
});

export function TinyMCEEditor({ value, onChange, placeholder, height = 300 }: TinyMCEEditorProps) {
  return (
    <Suspense fallback={<FallbackEditor value={value} onChange={onChange} placeholder={placeholder} height={height} />}>
      <TinyMCELazy
        apiKey="no-api-key" // For development - in production, get from env
        value={value}
        onEditorChange={(content: string) => {
          onChange(content);
        }}
        init={{
          height,
          menubar: false,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "code",
            "help",
            "wordcount",
          ],
          toolbar:
            "undo redo | blocks | " +
            "bold italic forecolor | alignleft aligncenter " +
            "alignright alignjustify | bullist numlist outdent indent | " +
            "removeformat | help",
          content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
          placeholder,
        }}
      />
    </Suspense>
  );
}

