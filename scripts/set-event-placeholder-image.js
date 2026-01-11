/**
 * Script to set the default event placeholder card image for a tenant
 * 
 * Usage:
 * 1. Open browser console on the admin page (while logged in)
 * 2. Copy and paste this entire script
 * 3. Run: setEventPlaceholderImage('etyek-budai', 'https://www.vaude.com/media/.renditions/magefan_blog/Nachhaltige_Stories/VAUDE_Wald_erleben_Tipps_7305-5MinSonne.jpg')
 */

async function setEventPlaceholderImage(tenantSlug, imageUrl) {
  try {
    // Get API base URL
    const apiBaseUrl = import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") || "";
    const token = localStorage.getItem("accessToken");
    
    if (!token) {
      throw new Error("Not logged in. Please log in first.");
    }

    // Step 1: Get all tenants
    console.log("Fetching tenants...");
    const tenantsRes = await fetch(`${apiBaseUrl}/api/admin/tenants`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!tenantsRes.ok) {
      throw new Error(`Failed to fetch tenants: ${tenantsRes.status}`);
    }

    const tenants = await tenantsRes.json();
    console.log("Tenants:", tenants);

    // Step 2: Find tenant by slug
    const tenant = tenants.find(t => t.slug === tenantSlug);
    if (!tenant) {
      throw new Error(`Tenant with slug "${tenantSlug}" not found`);
    }

    console.log(`Found tenant: ${tenant.slug} (ID: ${tenant.id})`);

    // Step 3: Get current site settings
    console.log("Fetching current site settings...");
    const settingsRes = await fetch(`${apiBaseUrl}/api/admin/app-settings/site-settings?tenantId=${tenant.id}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!settingsRes.ok) {
      throw new Error(`Failed to fetch site settings: ${settingsRes.status}`);
    }

    const currentSettings = await settingsRes.json();
    console.log("Current settings:", currentSettings);

    // Step 4: Update site settings with new image URL
    console.log(`Updating defaultEventPlaceholderCardImage to: ${imageUrl}`);
    const updateRes = await fetch(`${apiBaseUrl}/api/admin/app-settings/site-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tenantId: tenant.id,
        siteName: currentSettings.siteName,
        siteDescription: currentSettings.siteDescription,
        seoTitle: currentSettings.seoTitle,
        seoDescription: currentSettings.seoDescription,
        isCrawlable: currentSettings.isCrawlable,
        defaultPlaceholderCardImage: currentSettings.defaultPlaceholderCardImage,
        defaultPlaceholderDetailHeroImage: currentSettings.defaultPlaceholderDetailHeroImage,
        defaultEventPlaceholderCardImage: imageUrl.trim() || null,
        brandBadgeIcon: currentSettings.brandBadgeIcon,
        faviconUrl: currentSettings.faviconUrl,
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      throw new Error(`Failed to update site settings: ${updateRes.status} - ${errorText}`);
    }

    const updatedSettings = await updateRes.json();
    console.log("✅ Successfully updated site settings!");
    console.log("Updated defaultEventPlaceholderCardImage:", updatedSettings.defaultEventPlaceholderCardImage);
    
    return updatedSettings;
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Auto-run if called directly with the provided values
if (typeof window !== 'undefined') {
  // Make function available globally
  window.setEventPlaceholderImage = setEventPlaceholderImage;
  console.log("✅ Script loaded! Use: setEventPlaceholderImage('etyek-budai', 'IMAGE_URL')");
}
