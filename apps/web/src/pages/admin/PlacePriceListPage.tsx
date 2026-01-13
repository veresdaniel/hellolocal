// src/pages/admin/PlacePriceListPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { useToast } from "../../contexts/ToastContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { getPlace, getPlacePriceList, updatePlacePriceList, type PriceListBlock, type PriceList } from "../../api/admin.api";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { formatMoney } from "../../utils/formatMoney";
import { usePlatformSettings } from "../../app/site/usePlatformSettings";
import { useSiteContext } from "../../app/site/useSiteContext";

export function PlacePriceListPage() {
  const { t } = useTranslation();
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { selectedSiteId } = useAdminSite();
  const { showToast } = useToast();
  const { lang } = useSiteContext();
  usePageTitle("admin.priceList");

  const [blocks, setBlocks] = useState<PriceListBlock[]>([]);
  const [currency, setCurrency] = useState<string>("HUF");
  const [note, setNote] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load platform settings for currency formatting
  const { data: platformSettings } = usePlatformSettings({
    lang: lang || "hu",
    siteKey: "",
  });

  // Load place data
  const { data: place, isLoading: isLoadingPlace } = useQuery({
    queryKey: ["place", placeId, selectedSiteId],
    queryFn: () => {
      if (!placeId || !selectedSiteId) throw new Error("Missing placeId or siteId");
      return getPlace(placeId, selectedSiteId);
    },
    enabled: !!placeId && !!selectedSiteId,
  });

  // Load price list
  const { data: priceList, isLoading: isLoadingPriceList, refetch } = useQuery({
    queryKey: ["priceList", placeId, selectedSiteId],
    queryFn: () => {
      if (!placeId || !selectedSiteId) throw new Error("Missing placeId or siteId");
      return getPlacePriceList(placeId, selectedSiteId);
    },
    enabled: !!placeId && !!selectedSiteId,
    onSuccess: (data) => {
      if (data) {
        setBlocks(data.blocks || []);
        setCurrency(data.currency || "HUF");
        setNote(data.note || "");
        setIsActive(data.isActive ?? true);
        setIsEnabled(data.isEnabled ?? true);
        setRequireAuth(data.requireAuth ?? false);
        setHasUnsavedChanges(false);
      } else {
        // Empty state - initialize with empty blocks
        setBlocks([]);
        setCurrency("HUF");
        setNote("");
        setIsActive(true);
        setIsEnabled(true);
        setRequireAuth(false);
        setHasUnsavedChanges(false);
      }
    },
  });

  const handleSave = async () => {
    if (!placeId || !selectedSiteId) return;

    setIsSaving(true);
    try {
      await updatePlacePriceList(
        placeId,
        {
          blocks,
          currency,
          note: note || null,
          isActive,
          isEnabled,
          requireAuth,
        },
        selectedSiteId
      );
      setHasUnsavedChanges(false);
      showToast(t("admin.messages.priceListUpdated"), "success");
      await refetch();
    } catch (err: any) {
      let errorMessage = err?.response?.data?.message || err?.message || t("admin.errors.updatePriceListFailed");
      // Translate common backend error messages
      if (errorMessage === "You do not have access to this place" || errorMessage.includes("do not have access to this place")) {
        errorMessage = t("admin.errors.noAccessToPlace");
      }
      showToast(errorMessage, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlock = () => {
    setBlocks([...blocks, { title: "", items: [] }]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveBlock = (index: number) => {
    if (confirm(t("admin.confirmations.deleteBlock"))) {
      setBlocks(blocks.filter((_, i) => i !== index));
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateBlock = (index: number, block: PriceListBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    setBlocks(newBlocks);
    setHasUnsavedChanges(true);
  };

  const handleAddItem = (blockIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].items.push({ label: "", price: null });
    setBlocks(newBlocks);
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (blockIndex: number, itemIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].items = newBlocks[blockIndex].items.filter((_, i) => i !== itemIndex);
    setBlocks(newBlocks);
    setHasUnsavedChanges(true);
  };

  const handleUpdateItem = (blockIndex: number, itemIndex: number, item: { label: string; price: number | null; note?: string }) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].items[itemIndex] = item;
    setBlocks(newBlocks);
    setHasUnsavedChanges(true);
  };

  const getPlaceName = () => {
    if (!place) return "";
    const currentLang = (lang || "hu").split("-")[0] as "hu" | "en" | "de";
    const translation = place.translations?.find((t) => t.lang === currentLang) || place.translations?.find((t) => t.lang === "hu");
    return translation?.name || "-";
  };

  const platformLocale = platformSettings?.platform?.locale || "hu-HU";
  const platformCurrency = platformSettings?.platform?.currency || "HUF";

  if (isLoadingPlace || isLoadingPriceList) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(24px, 5vw, 32px)" }}>
        <LoadingSpinner isLoading={true} delay={0} />
      </div>
    );
  }

  if (!place) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(24px, 5vw, 32px)" }}>
        <div style={{ textAlign: "center", padding: 48 }}>
          <h2 style={{ color: "#dc3545", marginBottom: 16 }}>{t("error.notFound")}</h2>
          <p>{t("admin.errors.placeNotFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <AdminPageHeader
        title={t("admin.priceList")}
        subtitle={
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "#666" }}>{getPlaceName()}</span>
            {hasUnsavedChanges && (
              <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ff9800", fontWeight: 500 }}>
                {t("admin.unsavedChanges")}
              </span>
            )}
            {!hasUnsavedChanges && priceList && (
              <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#28a745", fontWeight: 500 }}>
                {t("admin.saved")}
              </span>
            )}
          </div>
        }
        showNewButton={false}
        isCreatingOrEditing={true}
        onSave={handleSave}
        onCancel={() => navigate(`/${lang}/admin/places`)}
        saveLabel={t("common.save")}
        cancelLabel={t("admin.backToPlace")}
        showBackButton={true}
        backTo={`/${lang}/admin/places`}
      />

      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "clamp(24px, 5vw, 32px)",
          marginTop: 24,
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
        }}
      >
        {/* Settings */}
        <div style={{ marginBottom: 32, padding: "20px", background: "#f8f9fa", borderRadius: 12 }}>
          <h3 style={{ marginBottom: 16, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "#333" }}>
            {t("admin.settings")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500 }}>
                {t("admin.currency")}
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
                placeholder="HUF"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
              <label htmlFor="isActive" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", cursor: "pointer" }}>
                {t("admin.active")}
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                id="isEnabled"
                checked={isEnabled}
                onChange={(e) => {
                  setIsEnabled(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
              <label htmlFor="isEnabled" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", cursor: "pointer" }}>
                {t("admin.enabled")}
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                id="requireAuth"
                checked={requireAuth}
                onChange={(e) => {
                  setRequireAuth(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
              <label htmlFor="requireAuth" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", cursor: "pointer" }}>
                {t("admin.requireAuth")}
              </label>
            </div>
          </div>
        </div>

        {/* Blocks */}
        {blocks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "clamp(48px, 10vw, 64px)",
              background: "#f8f9fa",
              borderRadius: 12,
              border: "2px dashed #ddd",
            }}
          >
            <p style={{ fontSize: "clamp(16px, 4vw, 18px)", color: "#666", marginBottom: 24 }}>
              {t("admin.noPriceList")}
            </p>
            <button
              onClick={handleAddBlock}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              + {t("admin.newBlock")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {blocks.map((block, blockIndex) => (
              <div
                key={blockIndex}
                style={{
                  padding: "clamp(20px, 4vw, 24px)",
                  background: "#f8f9fa",
                  borderRadius: 12,
                  border: "1px solid #e0e0e0",
                }}
              >
                <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) => {
                      handleUpdateBlock(blockIndex, { ...block, title: e.target.value });
                    }}
                    placeholder={t("admin.blockTitle")}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: "clamp(16px, 4vw, 18px)",
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  />
                  <button
                    onClick={() => handleRemoveBlock(blockIndex)}
                    style={{
                      padding: "8px 16px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 500,
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {t("common.delete")}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {block.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 40px",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px",
                        background: "white",
                        borderRadius: 8,
                        border: "1px solid #e0e0e0",
                      }}
                    >
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          handleUpdateItem(blockIndex, itemIndex, { ...item, label: e.target.value });
                        }}
                        placeholder={t("admin.itemLabel")}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      />
                      <div
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          width: "160px",
                        }}
                      >
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="9999999"
                          value={item.price ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            handleUpdateItem(blockIndex, itemIndex, { ...item, price: value });
                          }}
                          placeholder={t("admin.price")}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            paddingRight: item.price !== null && item.price !== undefined ? "50px" : "12px",
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                            fontFamily: "'Inter', system-ui, sans-serif",
                            textAlign: "right",
                          }}
                        />
                        {item.price !== null && item.price !== undefined && (
                          <span
                            style={{
                              position: "absolute",
                              right: "12px",
                              fontSize: "clamp(14px, 3.5vw, 16px)",
                              color: "#666",
                              pointerEvents: "none",
                              userSelect: "none",
                            }}
                          >
                            {(() => {
                              const formatted = formatMoney(item.price, { locale: platformLocale, currency: currency || platformCurrency });
                              // Extract currency symbol from formatted string (remove numbers, spaces, commas, dots)
                              return formatted.replace(/[\d.,\s]/g, "").trim() || (currency || platformCurrency);
                            })()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(blockIndex, itemIndex)}
                        style={{
                          padding: "6px 12px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: "clamp(12px, 3vw, 14px)",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          width: "40px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddItem(blockIndex)}
                    style={{
                      padding: "10px 16px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 500,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      alignSelf: "flex-start",
                    }}
                  >
                    + {t("admin.newItem")}
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddBlock}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease",
                alignSelf: "flex-start",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              + {t("admin.newBlock")}
            </button>
          </div>
        )}

        {/* Note (Rich Text) */}
        <div style={{ marginTop: 32 }}>
          <label style={{ display: "block", marginBottom: 12, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "#333" }}>
            {t("admin.note")}
          </label>
          <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
            <TipTapEditorWithUpload
              content={note}
              onChange={(html) => {
                setNote(html);
                setHasUnsavedChanges(true);
              }}
              placeholder={t("admin.notePlaceholder")}
            />
          </div>
        </div>
      </div>

      {isSaving && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#667eea", color: "white", padding: "12px 24px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000 }}>
          {t("admin.saving")}...
        </div>
      )}
    </div>
  );
}
