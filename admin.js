// تحديث الطلبات تلقائيًا بدون Refresh
let isUpdatingOrders = false;

async function refreshAdminOrders() {
  if (isUpdatingOrders || document.hidden) return;

  isUpdatingOrders = true;

  try {
    const response = await fetch('/api/admin/orders', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (response.status === 401) {
      window.location.replace('/admin-login.html');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const data = await response.json();

    adminOrders = data.orders || [];
    adminStats = data.stats || {};

    updateKpis();
    filterOrders();

  } catch (error) {
    console.error('Auto update error:', error);
  } finally {
    isUpdatingOrders = false;
  }
}

setInterval(refreshAdminOrders, 5000);
