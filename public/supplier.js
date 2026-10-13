document.addEventListener('DOMContentLoaded', () => {
  loadSupplierOrders();
});

async function loadSupplierOrders() {
  const container = document.getElementById('supplier-orders-list');
  container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> جاري جلب الطلبات المدفوعة...</div>';

  try {
    const res = await fetch('/api/supplier/orders');
    const data = await res.json();
    const orders = data.activeOrders || [];

    document.getElementById('supplier-pending-count').innerText = orders.length;
    document.getElementById('supplier-completed-count').innerText = data.completedToday || 0;

    if (orders.length === 0) {
      container.innerHTML = `
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:40px; text-align:center; color:var(--text-muted);">
          <i class="fa-solid fa-circle-check" style="font-size:3rem; color:#22c55e; margin-bottom:15px; display:block;"></i>
          <h3>عظيم جداً! لا توجد طلبات معلقة حالياً</h3>
          <p>تم تفعيل جميع الباقات المستلمة أو في انتظار طلبات جديدة من العملاء.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    orders.forEach(o => {
      const netBadgeColor = o.network === 'WE' ? '#d500f9' : o.network === 'ETISALAT' ? '#00e676' : o.network === 'ORANGE' ? '#ff9100' : '#ff5252';

      const card = document.createElement('div');
      card.className = 'supplier-card';
      card.innerHTML = `
        <div style="flex:1; min-width:250px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
            <b style="color:var(--primary); font-size:1.1rem;">${o.id}</b>
            <span style="background:${netBadgeColor}22; color:${netBadgeColor}; border:1px solid ${netBadgeColor}; padding:2px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">
              ${o.network}
            </span>
            <span style="font-size:0.8rem; color:var(--text-muted);">👤 ${o.customerName}</span>
          </div>

          <div style="display:flex; align-items:center; gap:12px; margin:8px 0;">
            <span style="font-size:1.2rem; font-weight:900; font-family:monospace; color:#fff;" id="phone-${o.id}">${o.activationPhone}</span>
            <button class="copy-phone-btn" onclick="copyPhone('${o.activationPhone}')">
              <i class="fa-solid fa-copy"></i> نسخ الرقم
            </button>
          </div>

          <div style="font-size:0.95rem; color:#f0f6fc; margin-top:4px;">
            📦 الباقة: <b>${o.packageName}</b>
          </div>
          ${o.notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">📝 ${o.notes}</div>` : ''}
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-select-pkg" style="background:#22c55e; color:#000; width:auto; padding:10px 18px;" onclick="markActivated('${o.id}', '${o.customerName}', '${o.activationPhone}', '${o.whatsappPhone}', '${o.packageName}', '${o.network}')">
            <i class="fa-solid fa-check"></i> ✅ تم التفعيل بنجاح
          </button>

          <button class="nav-btn" style="border-color:#ef4444; color:#ef4444; padding:10px 14px;" onclick="reportIssue('${o.id}')">
            <i class="fa-solid fa-triangle-exclamation"></i> إبلاغ عن مشكلة
          </button>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = '<div style="color:#ef4444; text-align:center; padding:20px;">تعذر الاتصال بالخادم لجلب طلبات المورد</div>';
  }
}

// Copy phone number
function copyPhone(num) {
  navigator.clipboard.writeText(num).then(() => {
    alert(`تم نسخ رقم الهاتف (${num}) للمحفظة لتجديد الباقة مباشرة!`);
  });
}

// Mark order activated
async function markActivated(orderId, name, actPhone, waPhone, pkgName, net) {
  if (!confirm(`تأكيد تفعيل الباقة (${pkgName}) للرقم (${actPhone}) للطلب ${orderId}؟`)) return;

  try {
    const res = await fetch(`/api/supplier/orders/${orderId}/activate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVATED' })
    });
    const data = await res.json();
    if (data.success) {
      alert(`🎉 تم اعتماد تفعيل الباقة بنجاح للطلب ${orderId}!`);

      // Prompt to notify client via WhatsApp
      const msg = `🎉 تم تفعيل باقتك بنجاح!
✅ العملية تمت بنجاح يا ${name}.
📦 الباقة: ${pkgName} على شبكة ${net}
📱 رقم التفعيل: ${actPhone}
⭐ ميزة عملاء وفر نت وميجامان:
لو بتجدد باقتك معانا بشكل مستمر، اسأل عن عروض التجديد الخاصة بالعملاء الدائمين 🎁🔥
📅 مستنيينك في التجديد الجاي 💙🛰️`;

      if (confirm(`هل ترغب في فتح واتساب لإرسال رسالة التهنئة بالتفعيل للعميل الآن؟`)) {
        window.open(`https://wa.me/2${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      loadSupplierOrders();
    }
  } catch (err) {
    alert('حدث خطأ أثناء تحديث حالة التفعيل');
  }
}

// Report issue
async function reportIssue(orderId) {
  const reason = prompt('يرجى كتابة سبب المشكلة (مثال: الخط موقوف، الباقة غير متوافقة، عليه فواتير، إلخ):');
  if (!reason) return;

  try {
    const res = await fetch(`/api/supplier/orders/${orderId}/activate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ISSUE', note: reason })
    });
    const data = await res.json();
    if (data.success) {
      alert(`تم تسجيل المشكلة للطلب ${orderId} وتحويله لخدمة العملاء.`);
      loadSupplierOrders();
    }
  } catch (err) {
    alert('فشل تسجيل المشكلة');
  }
}

// Export CSV for supplier
function exportCsv() {
  window.open('/api/export/csv', '_blank');
}
