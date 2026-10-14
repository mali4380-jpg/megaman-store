let adminOrders = [];
let adminStats = null;
let currentEditingOrderId = null;
let isLoadingAdminData = false;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminData();

  // تحديث الطلبات تلقائيًا كل 5 ثوانٍ
  setInterval(() => {
    if (document.hidden || currentEditingOrderId !== null) return;
    loadAdminData();
  }, 5000);
});

async function loadAdminData() {
  if (isLoadingAdminData) return;

  isLoadingAdminData = true;

  try {
    const res = await fetch('/api/admin/orders', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (res.status === 401) {
      window.location.replace('/admin-login.html');
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    adminOrders = Array.isArray(data.orders) ? data.orders : [];
    adminStats = data.stats || {};

    updateKpis();
    filterOrders();
  } catch (err) {
    console.error('Failed to load admin data:', err);
  } finally {
    isLoadingAdminData = false;
  }
}

function updateKpis() {
  if (!adminStats) return;

  const f = adminStats.financials || {};
  const s = adminStats.statusCounts || {};
  const n = adminStats.networkCounts || {};

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText('kpi-total-revenue', `${f.totalRevenue || 0} ج`);
  setText('kpi-daily-revenue', f.dailyRevenue || 0);
  setText('kpi-monthly-revenue', f.monthlyRevenue || 0);

  setText('kpi-net-profit', `${f.netProfitTotal || 0} ج`);
  setText('kpi-daily-profit', f.dailyProfit || 0);
  setText('kpi-monthly-profit', f.monthlyProfit || 0);

  setText('kpi-total-orders', adminStats.totalOrders || 0);
  setText('kpi-pending-review', s.pendingReview || 0);
  setText('kpi-awaiting-activation', s.awaitingActivation || 0);
  setText('kpi-activated-orders', s.activated || 0);
  setText('kpi-issues-refunds', (s.issue || 0) + (s.refunded || 0));
  setText('kpi-refund-amount', f.totalRefunds || 0);

  setText('stat-we-count', n.WE || 0);
  setText('stat-etisalat-count', n.ETISALAT || 0);
  setText('stat-orange-count', n.ORANGE || 0);
  setText('stat-vodafone-count', n.VODAFONE || 0);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted);">
          لا توجد طلبات مطابقة للبحث
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach(o => {
    const tr = document.createElement('tr');
    const status = String(o.orderStatus || '');

    let statusBadgeClass = 'badge-booking';

    if (status.includes('تمت مراجعتها') || status.includes('في انتظار التفعيل')) {
      statusBadgeClass = 'badge-awaiting';
    } else if (status.includes('تم تفعيلها') || status.includes('تم التفعيل')) {
      statusBadgeClass = 'badge-activated';
    } else if (status.includes('مشكله') || status.includes('مشكلة')) {
      statusBadgeClass = 'badge-issue';
    } else if (status.includes('استرداد') || status.includes('معلق')) {
      statusBadgeClass = 'badge-refund';
    }

    const netColor =
      o.network === 'WE' ? '#d500f9' :
      o.network === 'ETISALAT' ? '#00e676' :
      o.network === 'ORANGE' ? '#ff9100' : '#ff5252';

    tr.innerHTML = `
      <td><b style="color:var(--primary);">${o.id}</b></td>
      <td><b>${o.customerName}</b></td>
      <td style="font-family:monospace;font-size:0.95rem;">${o.activationPhone}</td>
      <td style="font-family:monospace;font-size:0.95rem;">
        <a href="https://wa.me/2${o.whatsappPhone}" target="_blank"
           style="color:#25d366;text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> ${o.whatsappPhone}
        </a>
      </td>
      <td><span style="color:${netColor};font-weight:bold;">${o.network}</span></td>
      <td>${o.packageName}</td>
      <td><b style="color:#10b981;">${o.price} ج</b></td>
      <td>
        ${o.paymentProof ? `
          <button class="nav-btn" style="padding:4px 8px;font-size:0.75rem;"
                  onclick="viewProof('${o.paymentProof}')">
            <i class="fa-solid fa-eye"></i> عرض
          </button>
        ` : `<span style="color:var(--text-muted);font-size:0.8rem;">لا يوجد</span>`}
      </td>
      <td>
        <span class="badge-status ${statusBadgeClass}">
          ${status}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="nav-btn" style="padding:6px 10px;font-size:0.8rem;"
                  onclick="openStatusEditModal('${o.id}')" title="تعديل الحالة">
            <i class="fa-solid fa-pen"></i>
          </button>

          ${status.includes('حجز') || status.includes('يتم مراجعتها') ? `
            <button class="btn-select-pkg"
                    style="padding:6px 10px;font-size:0.75rem;width:auto;background:#f97316;"
                    onclick="quickApproveToSupplier('${o.id}')"
                    title="اعتماد وإرسال للمورد">
              <i class="fa-solid fa-share"></i> للمورد
            </button>
          ` : ''}

          <button class="nav-btn"
                  style="padding:6px 10px;font-size:0.8rem;border-color:#25d366;color:#25d366;"
                  onclick="sendWhatsAppNotification('${o.id}')"
                  title="إرسال إشعار واتساب للعميل">
            <i class="fa-brands fa-whatsapp"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function filterOrders() {
  const search = (document.getElementById('admin-search-input')?.value || '')
    .toLowerCase().trim();
  const status = document.getElementById('admin-status-filter')?.value || 'ALL';
  const network = document.getElementById('admin-network-filter')?.value || 'ALL';

  let filtered = [...adminOrders];

  if (status !== 'ALL') {
    filtered = filtered.filter(o => o.orderStatus === status);
  }

  if (network !== 'ALL') {
    filtered = filtered.filter(o => o.network === network);
  }

  if (search) {
    filtered = filtered.filter(o =>
      String(o.id || '').toLowerCase().includes(search) ||
      String(o.customerName || '').toLowerCase().includes(search) ||
      String(o.activationPhone || '').includes(search) ||
      String(o.whatsappPhone || '').includes(search)
    );
  }

  renderOrdersTable(filtered);
}

async function quickApproveToSupplier(orderId) {
  if (!confirm(`هل أنت متأكد من اعتماد الدفع للطلب ${orderId} وإرساله مباشرة لشاشة المورد؟`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        status: 'طلبات تمت مراجعتها-في انتظار التفعيل',
        paymentStatus: 'تم الدفع',
        notes: 'تم الاعتماد السريع من لوحة الإدارة وإرساله للمورد'
      })
    });

    if (res.status === 401) {
      window.location.replace('/admin-login.html');
      return;
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل اعتماد الطلب');
    }

    alert(`تم اعتماد الطلب ${orderId} وإرساله للمورد`);
    await loadAdminData();
  } catch (err) {
    alert(err.message || 'حدث خطأ أثناء اعتماد الطلب');
  }
}

function openStatusEditModal(orderId) {
  currentEditingOrderId = orderId;
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) {
    currentEditingOrderId = null;
    return;
  }

  document.getElementById('modal-order-summary').innerHTML = `
    <b>رقم الطلب:</b> ${order.id} |
    <b>العميل:</b> ${order.customerName} (${order.activationPhone})
    <br>
    <b>الباقة:</b> ${order.network} - ${order.packageName} (${order.price} ج)
  `;

  document.getElementById('edit-order-status').value = order.orderStatus;
  document.getElementById('edit-payment-status').value = order.paymentStatus;
  document.getElementById('edit-order-notes').value = order.notes || '';

  openModal('status-edit-modal');
}

async function saveOrderStatus() {
  if (!currentEditingOrderId) return;

  const orderId = currentEditingOrderId;
  const status = document.getElementById('edit-order-status').value;
  const paymentStatus = document.getElementById('edit-payment-status').value;
  const notes = document.getElementById('edit-order-notes').value.trim();

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ status, paymentStatus, notes })
    });

    if (res.status === 401) {
      window.location.replace('/admin-login.html');
      return;
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل حفظ التعديلات');
    }

    closeModal('status-edit-modal');
    currentEditingOrderId = null;

    await loadAdminData();

    if (data.notificationMessage) {
      const send = confirm(
        `تم تحديث الطلب بنجاح!\n\nهل ترغب في إرسال الإشعار للعميل؟\n\n${data.notificationMessage}`
      );

      if (send) {
        const order = adminOrders.find(o => o.id === orderId);
        if (order) {
          window.open(
            `https://wa.me/2${order.whatsappPhone}?text=${encodeURIComponent(data.notificationMessage)}`,
            '_blank'
          );
        }
      }
    }
  } catch (err) {
    alert(err.message || 'فشل حفظ التعديلات');
  }
}

function sendWhatsAppNotification(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;

  const msg = `مرحباً بك يا ${order.customerName} ⚡
بخصوص طلبك رقم (${order.id}) على باقة ${order.packageName} لشبكة ${order.network}:
حالة الطلب الحالية: 【 ${order.orderStatus} 】
رقم التفعيل: ${order.activationPhone}
شكراً لتعاملك مع ميجامان محارب النت 🛡️`;

  window.open(
    `https://wa.me/2${order.whatsappPhone}?text=${encodeURIComponent(msg)}`,
    '_blank'
  );
}

async function runAiReconcile() {
  const smsText = document.getElementById('ai-sms-input').value.trim();

  if (!smsText) {
    alert('يرجى لصق نص رسالة التحويل');
    return;
  }

  const resultBox = document.getElementById('ai-reconcile-result');
  resultBox.style.display = 'block';
  resultBox.innerHTML = 'جاري التحليل والمطابقة الذكية...';

  try {
    const res = await fetch('/api/admin/reconcile-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ smsText })
    });

    if (res.status === 401) {
      window.location.replace('/admin-login.html');
      return;
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      resultBox.innerHTML = '<span style="color:#ef4444;">حدث خطأ في محرك الفحص</span>';
      return;
    }

    const rec = data.reconciliation;
    const isSuccess = rec.matchedOrder && rec.confidence === '98%';

    resultBox.innerHTML = `
      <div style="color:${isSuccess ? '#10b981' : '#f59e0b'};font-weight:bold;margin-bottom:6px;">
        ${isSuccess
          ? 'تمت المطابقة وتأكيد الدفع ونقل الطلب للمورد تلقائياً!'
          : 'نتيجة الفحص:'}
      </div>
      <div>
        <b>المبلغ المستخرج:</b> ${rec.extractedAmount || 'غير محدد'} ج.م |
        <b>الهاتف المستخرج:</b> ${rec.extractedPhone || 'غير محدد'} |
        <b>رقم المرجع:</b> ${rec.refCode || 'N/A'}
      </div>
      <div>
        <b>نسبة الثقة:</b> ${rec.confidence} |
        <b>السبب:</b> ${rec.matchReason}
      </div>
      ${rec.matchedOrder ? `
        <div style="margin-top:6px;color:var(--primary);">
          الطلب المرتبط: <b>${rec.matchedOrder.id}</b> -
          العميل: ${rec.matchedOrder.customerName}
          (${rec.matchedOrder.packageName})
        </div>
      ` : ''}
    `;

    if (isSuccess) {
      await loadAdminData();
    }
  } catch (err) {
    resultBox.innerHTML =
      '<span style="color:#ef4444;">تعذر الاتصال بمحرك الذكاء الاصطناعي</span>';
  }
}

function viewProof(url) {
  document.getElementById('modal-proof-img').src = url;
  openModal('proof-viewer-modal');
}

async function resetOrdersOnly() {
  const firstConfirm = confirm(
    'تنبيه مهم: سيتم حذف جميع الطلبات والحجوزات فقط.\n\n' +
    'لن يتم حذف حسابات العملاء أو الإعدادات أو الباقات.\n\n' +
    'العملية لا يمكن التراجع عنها. هل تريد المتابعة؟'
  );

  if (!firstConfirm) return;

  const confirmationWord = prompt('للتأكيد النهائي، اكتب كلمة: تصفير');

  if (confirmationWord !== 'تصفير') {
    if (confirmationWord !== null) {
      alert('لم يتم التصفير؛ كلمة التأكيد غير مطابقة.');
    }
    return;
  }

  const button = document.querySelector('button[onclick="resetOrdersOnly()"]');

  if (button) {
    button.disabled = true;
    button.innerHTML = 'جارٍ التصفير...';
  }

  try {
    const res = await fetch('/api/admin/orders/reset', {
      method: 'POST',
      credentials: 'same-origin'
    });

    if (res.status === 401) {
      window.location.replace('/admin-login.html');
      return;
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'تعذر تصفير الطلبات');
    }

    alert(`تم تصفير الطلبات بنجاح. عدد الطلبات المحذوفة: ${data.deletedCount}`);

    await loadAdminData();
  } catch (err) {
    alert(err.message || 'حدث خطأ أثناء تصفير الطلبات');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = 'تصفير الطلبات فقط';
    }
  }
}

function exportExcel() {
  window.location.href = '/api/export/excel';
}

function exportCsv() {
  window.location.href = '/api/export/csv';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');

  if (id === 'status-edit-modal') {
    currentEditingOrderId = null;
  }
}

async function adminLogout() {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } finally {
    window.location.replace('/admin-login.html');
  }
}
