// src/components/SocialShareButtons.tsx
import { useTranslation } from "react-i18next";

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
}

export function SocialShareButtons({ url, title, description, image }: SocialShareButtonsProps) {
  const { t } = useTranslation();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || "");
  const encodedImage = encodeURIComponent(image || "");

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? `&via=${encodedDescription}` : ""}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    const shareUrl = shareLinks[platform];
    if (platform === "email") {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, "_blank", "width=600,height=400,scrollbars=yes,resizable=yes");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert(t("public.linkCopied") || "Link másolva!");
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: 12,
        background: "rgba(102, 126, 234, 0.03)",
        borderRadius: 8,
        border: "1px solid rgba(102, 126, 234, 0.08)",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: "#888", marginRight: 4 }}>
        {t("public.share") || "Megosztás"}:
      </span>
      <button
        onClick={() => handleShare("facebook")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "#1877f2",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#166fe5";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#1877f2";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        📘
      </button>
      <button
        onClick={() => handleShare("twitter")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "#1da1f2",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1a91da";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#1da1f2";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        🐦
      </button>
      <button
        onClick={() => handleShare("linkedin")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "#0077b5",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#006399";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#0077b5";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        💼
      </button>
      <button
        onClick={() => handleShare("whatsapp")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "#25d366",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#20ba5a";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#25d366";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        💬
      </button>
      <button
        onClick={() => handleShare("email")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "#666",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#555";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#666";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        ✉️
      </button>
      <button
        onClick={handleCopyLink}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "white",
          color: "#667eea",
          border: "1px solid #667eea",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 16,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f0f0f0";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        🔗
      </button>
    </div>
  );
}

