# Set Default Event Placeholder Card Image

This script helps you set the default event placeholder card image for a tenant.

## Quick Browser Console Method

1. Open your browser console on the admin page (while logged in)
2. Copy and paste this code:

```javascript
(async () => {
  const tenantSlug = 'etyek-budai';
  const imageUrl = 'https://www.vaude.com/media/.renditions/magefan_blog/Nachhaltige_Stories/VAUDE_Wald_erleben_Tipps_7305-5MinSonne.jpg';
  
  const apiBaseUrl = import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") || "";
  const token = localStorage.getItem("accessToken");
  
  if (!token) {
    console.error("Not logged in!");
    return;
  }
  
  // Get tenants
  const tenantsRes = await fetch(`${apiBaseUrl}/api/admin/tenants`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  });
  const tenants = await tenantsRes.json();
  const tenant = tenants.find(t => t.slug === tenantSlug);
  
  if (!tenant) {
    console.error(`Tenant "${tenantSlug}" not found`);
    return;
  }
  
  // Get current settings
  const settingsRes = await fetch(`${apiBaseUrl}/api/admin/app-settings/site-settings?tenantId=${tenant.id}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  });
  const currentSettings = await settingsRes.json();
  
  // Update settings
  const updateRes = await fetch(`${apiBaseUrl}/api/admin/app-settings/site-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      tenantId: tenant.id,
      ...currentSettings,
      defaultEventPlaceholderCardImage: imageUrl.trim() || null
    })
  });
  
  const updated = await updateRes.json();
  console.log("✅ Updated! defaultEventPlaceholderCardImage:", updated.defaultEventPlaceholderCardImage);
})();
```

## Alternative: Use Admin Interface

You can also set this through the admin interface:
1. Go to Admin → App Settings
2. Find "Default Event Placeholder Card Image" field
3. Paste the image URL
4. Click Save
