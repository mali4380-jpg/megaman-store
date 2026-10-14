// تحديث طلبات لوحة الآدمين تلقائيًا
let adminAutoRefreshRunning = false;

setInterval(async () => {
  if (adminAutoRefreshRunning) return;

  // متحدثش البيانات لو الصفحة مش مفتوحة
  if (document.hidden) return;

  // متحدثش أثناء تعديل بيانات داخل نموذج
  const active = document.activeElement;
  if (
    active &&
    ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)
  ) {
    return;
  }

  adminAutoRefreshRunning = true;

  try {
    await loadAdminData();
  } catch (error) {
    console.error("خطأ في تحديث الطلبات:", error);
  } finally {
    adminAutoRefreshRunning = false;
  }
}, 5000);
