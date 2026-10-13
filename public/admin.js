let adminOrders = [];
let adminStats = null;
let currentEditingOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminData();
});

async function loadAdminData() {
  try {
    const res = await fetch('/api/admin/orders');
    if (res.status === 401) { window.location.href = '/admin.html'; return; }
    const data = await res.json();
    adminOrders = data.orders || [];
    adminStats = data.stats || {};

    updateKpis();
    renderOrdersTable(adminOrders);
  } catch (err) {
    console.error('Failed to load admin data:', err);
  }
}

function updateKpis() {
  if (!adminStats) return;
  const f = adminStats.financials || {};
  const s = adminStats.statusCounts || {};
  const n = adminStats.networkCounts || {};

  // Financials
  document.getElementById('kpi-total-revenue').innerText = `${f.totalRevenue || 0} ج`;
  document.getElementById('kpi-daily-revenue').innerText = f.dailyRevenue || 0;
  document.getElementById('kpi-monthly-revenue').innerText = f.monthlyRevenue || 0;

  document.getElementById('kpi-net-profit').innerText = `${f.netProfitTotal || 0} ج`;
  document.getElementById('kpi-daily-profit').innerText = f.dailyProfit || 0;
  document.getElementById('kpi-monthly-profit').innerText = f.monthlyProfit || 0;

  // Statuses
  document.getElementById('kpi-total-orders').innerText = adminStats.totalOrders || 0;
  document.getElementById('kpi-pending-review').innerText = s.pendingReview || 0;
  document.getElementById('kpi-awaiting-activation').innerText = s.awaitingActivation || 0;
  document.getElementById('kpi-activated-orders').innerText = s.activated || 0;
  document.getElementById('kpi-issues-refunds').innerText = (s.issue || 0) + (s.refunded || 0);
  document.getElementById('kpi-refund-amount').innerText = f.totalRefunds || 0;

  // Networks
  document.getElementById('stat-we-count').innerText = n.WE || 0;
  document.getElementById('stat-etisalat-count').innerText = n.ETISALAT || 0;
  document.getElementById('stat-orange-count').innerText = n.ORANGE || 0;
  document.getElementById('stat-vodafone-count').innerText = n.VODAFONE || 0;
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('admin-orders-tbody');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">لا توجد طلبات مطابقة للبحث</td></tr>`;
    return;
  }

  orders.forEach(o => {
    const tr = document.createElement('tr');

    let statusBadgeClass = 'badge-booking';
    if (o.orderStatus.includes('تمت مراجعتها') || o.orderStatus.includes('في انتظار التفعيل')) statusBadgeClass = 'badge-awaiting';
    else if (o.orderStatus.includes('تم تفعيلها') || o.orderStatus.includes('تم التفعيل')) statusBadgeClass = 'badge-activated';
    else if (o.orderStatus.includes('مشكله') || o.orderStatus.includes('مشكلة')) statusBadgeClass = 'badge-issue';
    else if (o.orderStatus.includes('استرداد') || o.orderStatus.includes('معلق')) statusBadgeClass = 'badge-refund';

    const netColor = o.network === 'WE' ? '#d500f9' : o.network === 'ETISALAT' ? '#00e676' : o.network === 'ORANGE' ? '#ff9100' : '#ff5252';

    tr.innerHTML = `
      <td><b style="color:var(--primary);">${o.id}</b></td>
      <td><b>${o.customerName}</b></td>
      <td style="font-family:monospace; font-size:0.95rem;">${o.activationPhone}</td>
      <td style="font-family:monospace; font-size:0.95rem;">
        <a href="https://wa.me/2${o.whatsappPhone}" target="_blank" style="color:#25d366; text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> ${o.whatsappPhone}
        </a>
      </td>
      <td><span style="color:${netColor}; font-weight:bold;">${o.network}</span></td>
      <td>${o.packageName}</td>
      <td><b style="color:#10b981;">${o.price} ج</b></td>
      <td>
        ${o.paymentProof ? `
          <button class="nav-btn" style="padding:4px 8px; font-size:0.75rem;" onclick="viewProof('${o.paymentProof}')">
            <i class="fa-solid fa-eye"></i> عرض
          </button>
        ` : `<span style="color:var(--text-muted); font-size:0.8rem;">لا يوجد</span>`}
      </td>
      <td>
        <span class="badge-status ${statusBadgeClass}">
          ${o.orderStatus}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="nav-btn" style="padding:6px 10px; font-size:0.8rem;" onclick="openStatusEditModal('${o.id}')" title="تعديل الحالة">
            <i class="fa-solid fa-pen"></i>
          </button>
          
          ${o.orderStatus.includes('حجز') || o.orderStatus.includes('يتم مراجعتها') ? `
            <button class="btn-select-pkg" style="padding:6px 10px; font-size:0.75rem; width:auto; background:#f97316;" onclick="quickApproveToSupplier('${o.id}')" title="اعتماد وإرسال للمورد">
              <i class="fa-solid fa-share"></i> للمورد
            </button>
          ` : ''}

          <button class="nav-btn" style="padding:6px 10px; font-size:0.8rem; border-color:#25d366; color:#25d366;" onclick="sendWhatsAppNotification('${o.id}')" title="إرسال إشعار واتساب للعميل">
            <i class="fa-brands fa-whatsapp"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterOrders() {
  const search = document.getElementById('admin-search-input').value.toLowerCase().trim();
  const status = document.getElementById('admin-status-filter').value;
  const network = document.getElementById('admin-network-filter').value;

  let filtered = [...adminOrders];

  if (status !== 'ALL') {
    filtered = filtered.filter(o => o.orderStatus === status);
  }
  if (network !== 'ALL') {
    filtered = filtered.filter(o => o.network === network);
  }
  if (search) {
    filtered = filtered.filter(o =>
      o.id.toLowerCase().includes(search) ||
      o.customerName.toLowerCase().includes(search) ||
      o.activationPhone.includes(search) ||
      o.whatsappPhone.includes(search)
    );
  }

  renderOrdersTable(filtered);
}

// Quick Approve to Supplier
async function quickApproveToSupplier(orderId) {
  if (!confirm(`هل أنت متأكد من اعتماد الدفع للطلب ${orderId} وإرساله مباشرة لشاشة المورد؟`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: "طلبات تمت مراجعتها-في انتظار التفعيل",
        paymentStatus: "تم الدفع",
        notes: "تم الاعتماد السريع من لوحة الإدارة وإرساله للمورد"
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ تم اعتماد الطلب ${orderId} ونقله فوراً لشاشة المورد!`);
      loadAdminData();
    }
  } catch (err) {
    alert('حدث خطأ أثناء اعتماد الطلب');
  }
}

// Open Status Edit Modal
function openStatusEditModal(orderId) {
  currentEditingOrderId = orderId;
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('modal-order-summary').innerHTML = `
    <b>رقم الطلب:</b> ${order.id} | <b>العميل:</b> ${order.customerName} (${order.activationPhone})<br>
    <b>الباقة:</b> ${order.network} - ${order.packageName} (${order.price} ج)
  `;

  document.getElementById('edit-order-status').value = order.orderStatus;
  document.getElementById('edit-payment-status').value = order.paymentStatus;
  document.getElementById('edit-order-notes').value = order.notes || '';

  openModal('status-edit-modal');
}

// Save Order Status
async function saveOrderStatus() {
  if (!currentEditingOrderId) return;
  const status = document.getElementById('edit-order-status').value;
  const paymentStatus = document.getElementById('edit-payment-status').value;
  const notes = document.getElementById('edit-order-notes').value.trim();

  try {
    const res = await fetch(`/api/admin/orders/${currentEditingOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, paymentStatus, notes })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('status-edit-modal');
      loadAdminData();
      if (data.notificationMessage) {
        if (confirm(`تم تحديث الطلب بنجاح!\n\nهل ترغب في فتح واتساب لإرسال الإشعار التالي للعميل الآن؟\n\n"${data.notificationMessage}"`)) {
          const order = adminOrders.find(o => o.id === currentEditingOrderId);
          window.open(`https://wa.me/2${order.whatsappPhone}?text=${encodeURIComponent(data.notificationMessage)}`, '_blank');
        }
      }
    }
  } catch (err) {
    alert('فشل حفظ التعديلات');
  }
}

// Send WhatsApp Notification for Order
function sendWhatsAppNotification(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;

  let msg = `مرحباً بك يا ${order.customerName} ⚡
بخصوص طلبك رقم (${order.id}) على باقة ${order.packageName} لشبكة ${order.network}:
حالة الطلب الحالية: 【 ${order.orderStatus} 】
رقم التفعيل: ${order.activationPhone}
شكراً لتعاملك مع ميجامان محارب النت 🛡️`;

  window.open(`https://wa.me/2${order.whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// AI Reconciliation Simulator
async function runAiReconcile() {
  const smsText = document.getElementById('ai-sms-input').value.trim();
  if (!smsText) {
    alert('يرجى لصق نص رسالة التحويل');
    return;
  }

  const resultBox = document.getElementById('ai-reconcile-result');
  resultBox.style.display = 'block';
  resultBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحليل والمطابقة الذكية...';

  try {
    const res = await fetch('/api/admin/reconcile-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smsText })
    });

    const data = await res.json();
    if (!data.success) {
      resultBox.innerHTML = '<span style="color:#ef4444;">حدث خطأ في محرك الفحص</span>';
      return;
    }

    const rec = data.reconciliation;
    const isSuccess = rec.matchedOrder && rec.confidence === '98%';

    resultBox.innerHTML = `
      <div style="color:${isSuccess ? '#10b981' : '#f59e0b'}; font-weight:bold; margin-bottom:6px;">
        <i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> 
        ${isSuccess ? 'تمت المطابقة وتأكيد الدفع ونقل الطلب للمورد تلقائياً!' : 'نتيجة الفحص:'}
      </div>
      <div><b>المبلغ المستخرج:</b> ${rec.extractedAmount || 'غير محدد'} ج.م | <b>الهاتف المستخرج:</b> ${rec.extractedPhone || 'غير محدد'} | <b>رقم المرجع:</b> ${rec.refCode || 'N/A'}</div>
      <div><b>نسبة الثقة:</b> ${rec.confidence} | <b>السبب:</b> ${rec.matchReason}</div>
      ${rec.matchedOrder ? `<div style="margin-top:6px; color:var(--primary);">الطلب المرتبط: <b>${rec.matchedOrder.id}</b> - العميل: ${rec.matchedOrder.customerName} (${rec.matchedOrder.packageName})</div>` : ''}
    `;

    if (isSuccess) {
      loadAdminData();
    }
  } catch (err) {
    resultBox.innerHTML = '<span style="color:#ef4444;">تعذر الاتصال بمحرك الذكاء الاصطناعي</span>';
  }
}

// View Proof Image
function viewProof(url) {
  document.getElementById('modal-proof-img').src = url;
  openModal('proof-viewer-modal');
}

// Reset only orders/bookings. Customer accounts, settings, and packages are preserved.
async function resetOrdersOnly() {
  const firstConfirm = confirm(
    'تنبيه مهم: سيتم حذف جميع الطلبات والحجوزات فقط، وستعود أرقام الطلبات والإحصائيات إلى الصفر.\n\n' +
    'لن يتم حذف حسابات العملاء أو الإعدادات أو الباقات. العملية لا يمكن التراجع عنها.\n\nهل تريد المتابعة؟'
  );
  if (!firstConfirm) return;

  const confirmationWord = prompt('للتأكيد النهائي، اكتب كلمة: تصفير');
  if (confirmationWord !== 'تصفير') {
    if (confirmationWord !== null) alert('لم يتم التصفير؛ كلمة التأكيد غير مطابقة.');
    return;
  }

  const button = document.querySelector('button[onclick="resetOrdersOnly()"]');
  if (button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ التصفير...'; }
  try {
    const res = await fetch('/api/admin/orders/reset', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { window.location.href = '/admin-login.html'; return; }
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر تصفير الطلبات');
    alert(`تم تصفير الطلبات بنجاح. عدد الطلبات المحذوفة: ${data.deletedCount}. حسابات العملاء والإعدادات والباقات كما هي.`);
    await loadAdminData();
  } catch (err) {
    alert(err.message || 'حدث خطأ أثناء تصفير الطلبات.');
  } finally {
    if (button) { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-trash-can"></i> تصفير الطلبات فقط'; }
  }
}

// Export Excel workbook with separate network sheets and a final all-orders sheet
function exportExcel() {
  window.location.href = '/api/export/excel';
}

function exportCsv() {
  window.location.href = '/api/export/csv';
}

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}


async function adminLogout() {
  try { await fetch('/api/admin/logout', { method: 'POST' }); } finally { window.location.href = '/admin.html'; }
}
