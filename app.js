// Global State
let appConfig = null;
let currentNetwork = 'WE';
let currentUser = null;
let selectedPackage = null;
let currentActiveOrder = null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  loadStoredUser();
  await fetchConfig();
  selectNetwork(currentNetwork);
  if (sessionStorage.getItem('megaman_active_order')) {
    try { currentActiveOrder = JSON.parse(sessionStorage.getItem('megaman_active_order')); } catch {}
  }

  // Check URL parameters for tracking (e.g. ?track=WN-000101)
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('track');
  if (trackId) {
    document.getElementById('track-input').value = trackId;
    trackOrderWithId(trackId);
  }
});

// 1. Fetch Configuration & Packages from Backend
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    appConfig = data;

    // Update settings in UI
    if (appConfig.settings) {
      if (document.getElementById('instapay-val')) {
        document.getElementById('instapay-val').innerText = '01009668613';
      }
      if (document.getElementById('wallet-val')) {
        document.getElementById('wallet-val').innerText = '01009668613';
      }
      if (document.getElementById('floating-whatsapp-btn')) {
        document.getElementById('floating-whatsapp-btn').href = `https://wa.me/${201150944189}?text=مرحباً%20ميجامان،%20أريد%20الاستفسار%20عن%20باقات%20النت`;
      }
    }
  } catch (err) {
    console.error('Failed to load configuration:', err);
  }
}

// 2. Select Network Tab
function selectNetwork(network) {
  currentNetwork = network;
  
  // Update Tab buttons UI
  document.querySelectorAll('.network-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.querySelector(`.network-tab-btn.${network.toLowerCase()}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Toggle Vodafone special banner
  const vfBanner = document.getElementById('vodafone-info-banner');
  if (vfBanner) vfBanner.style.display = 'none';

  const featureImage = document.getElementById('network-feature-image');
  const instructions = document.getElementById('network-instructions');
  const networkInfo = {
    WE: { image: 'images/we-packages.jpeg', alt: 'باقات وي جولد', title: 'تعليمات باقات WE Gold', items: ['التجديد رسمي على نفس الخط دون تغيير الشريحة.', 'متاح لخطوط WE الفردية، ولا يشمل خطوط تكافل وكرامة أو التربية والتعليم أو حياة كريمة.', 'تأكد أن الخط يستقبل المكالمات ولا يوجد استلاف رصيد يمنع نزول الباقة.', 'مواعيد الطلب: قبل يوم 1 أو يوم 15 من الشهر.'] },
    ETISALAT: { image: 'images/etisalat-packages.jpeg', alt: 'باقات اتصالات أميرالد VIP', title: 'تعليمات باقات اتصالات أميرالد VIP', items: ['يجب أن يكون الخط على نظام 14 قرش.', 'يشترط خلو الخط من المديونية أو استلاف الرصيد.', 'يجب أن يكون الخط مسجلاً باسم العميل بالرقم القومي.', 'التفعيل يوم 1 أو يوم 15 من الشهر، والعدد محدود بكل دورة.', 'المحاسبة دقيقة بدقيقة لأي شبكة وميجا بميجا لأي موقع.'] },
    VODAFONE: { image: 'images/vodafone-packages.jpeg', alt: 'باقات فودافون ريد', title: 'تعليمات باقات فودافون ريد', items: ['مواعيد التجديد يوم 10 ويوم 25 من الشهر الساعة 12 مساءً.', 'الاشتراك المبكر يمنح 3 جيجا + 1000 دقيقة حتى موعد التجديد.', 'يلزم رقم الخط وكلمة مرور تطبيق أنا فودافون، والاستمرار 6 شهور.', 'يشترط رصيد كافٍ وعدم وجود استلاف أو مديونية.', 'لا يمكن تغيير الباقة بعد الربط، وتوجد ضريبة حكومية 22 جنيهاً كل 6 شهور.', 'المحاسبة دقيقة بدقيقة لكل الشبكات وميجا بميجا لأي موقع.'] },
    ORANGE: { image: 'images/orange-packages.jpeg', alt: 'باقات أورنج الشهرية', title: 'تعليمات عروض أورنج الشهرية', items: ['صلاحية الباقة 30 يوماً من تاريخ التفعيل.', 'التجديد الرسمي على نفس الشريحة دون تغيير الخط.', 'المحاسبة دقيقة بدقيقة وميجا بميجا.', 'ألغِ أي باقة إنترنت قديمة منتهية لتجنب تضارب التجديد التلقائي.', 'مواعيد الطلب: قبل يوم 1 أو يوم 15 من الشهر.'] }
  };
  const info = networkInfo[network];
  if (featureImage && info) { featureImage.src = info.image; featureImage.alt = info.alt; }
  if (instructions && info) instructions.innerHTML = `<h4>${info.title}</h4><ul>${info.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  renderPackages(network);
}

// 3. Render Packages Cards
function renderPackages(network) {
  const container = document.getElementById('packages-container');
  if (!container || !appConfig || !appConfig.packages) return;

  const packages = appConfig.packages[network] || [];
  container.innerHTML = '';

  packages.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'package-card';

    const savingAmount = pkg.originalPrice && pkg.price ? (pkg.originalPrice - pkg.price) : 0;
    const savingPercent = pkg.originalPrice && pkg.price ? Math.round((savingAmount / pkg.originalPrice) * 100) : 30;

    card.innerHTML = `
      ${pkg.popular ? `<div class="package-badge-popular"><i class="fa-solid fa-fire"></i> الأكثر طلباً</div>` : ''}
      <div class="package-header">
        <h4>${pkg.name}</h4>
      </div>
      <div class="package-specs">
        <div class="spec-item"><i class="fa-solid fa-wifi" style="color:var(--primary);"></i> ${pkg.data}</div>
        <div class="spec-item"><i class="fa-solid fa-phone" style="color:#10b981;"></i> ${pkg.minutes}</div>
      </div>
      <div class="package-pricing">
        <div class="price-main">
          ${pkg.isCustomPrice ? `
            <span class="price-num" style="font-size:1.3rem; color:#ff5252;">${pkg.priceText || 'حسب العرض'}</span>
          ` : `
            <span class="price-num">${pkg.price}</span>
            <span class="price-unit">جنيه مصري</span>
            ${pkg.originalPrice ? `<span class="price-original">${pkg.originalPrice} ج</span>` : ''}
          `}
        </div>
        ${savingAmount > 0 ? `
          <div class="saving-tag"><i class="fa-solid fa-tag"></i> وفر ${savingAmount} جنيه (${savingPercent}% خصم)</div>
        ` : ''}
      </div>
      <button class="btn-select-pkg" onclick='initOrderPackage(${JSON.stringify(pkg).replace(/'/g, "&apos;")})'>
        <i class="fa-solid fa-bolt"></i> ${pkg.isCustomPrice ? 'استفسر عن السعر الآن' : 'اختر الباقة واحجز الآن'}
      </button>
    `;

    container.appendChild(card);
  });
}

// 4. Order Initiation
function initOrderPackage(pkg) {
  if (pkg.isCustomPrice) {
    openVodafoneInquiryModal(pkg.name);
    return;
  }

  selectedPackage = pkg;

  // Fill Step 1 review details
  document.getElementById('summary-network-badge').innerText = currentNetwork;
  document.getElementById('summary-package-name').innerText = pkg.name;
  document.getElementById('summary-package-price').innerText = `${pkg.price} جنيه مصري`;

  // Pre-fill user data if logged in
  if (currentUser) {
    document.getElementById('order-customer-name').value = currentUser.name || '';
    document.getElementById('order-activation-phone').value = currentUser.phone || '';
  }

  goToOrderStep(1);
  openModal('order-modal');
}

// Order Wizard Navigation
function goToOrderStep(step) {
  document.getElementById('order-step-1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('order-step-2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('order-step-3').style.display = step === 3 ? 'block' : 'none';
  document.getElementById('order-step-4').style.display = step === 4 ? 'block' : 'none';
}

let isSameWhatsAppNumber = true;
function setSameWhatsApp(isSame) {
  isSameWhatsAppNumber = isSame;
  const yesBtn = document.getElementById('same-phone-yes');
  const noBtn = document.getElementById('same-phone-no');
  const diffGroup = document.getElementById('diff-whatsapp-group');

  if (isSame) {
    yesBtn.classList.add('active');
    noBtn.classList.remove('active');
    diffGroup.style.display = 'none';
  } else {
    noBtn.classList.add('active');
    yesBtn.classList.remove('active');
    diffGroup.style.display = 'block';
  }
}

// Submit Order Details (Step 2 -> Step 3)
async function submitOrderDetails() {
  const customerName = document.getElementById('order-customer-name').value.trim();
  const activationPhone = document.getElementById('order-activation-phone').value.trim();
  let whatsappPhone = activationPhone;

  if (!isSameWhatsAppNumber) {
    whatsappPhone = document.getElementById('order-whatsapp-phone').value.trim();
  }

  if (!customerName || !activationPhone) {
    alert('الرجاء إدخال اسمك ورقم الهاتف المراد تفعيل الباقة عليه بشكل صحيح.');
    return;
  }

  if (!/^01[0125][0-9]{8}$/.test(activationPhone)) {
    alert('رقم هاتف التفعيل غير صحيح! تأكد أنه يبدأ بـ 010 أو 011 أو 012 أو 015 ومكون من 11 رقماً.');
    return;
  }

  // Create Order in Backend
  try {
    const payload = {
      customerName,
      customerPhone: currentUser ? currentUser.phone : activationPhone,
      activationPhone,
      whatsappPhone,
      network: currentNetwork,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      price: selectedPackage.price,
      paymentMethod: "InstaPay / محفظة إلكترونية"
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'حدث خطأ أثناء حجز الباقة');
      return;
    }

    currentActiveOrder = data.order;
    sessionStorage.setItem('megaman_active_order', JSON.stringify(currentActiveOrder));

    // Fill Step 3 (Payment Details)
    document.getElementById('pay-order-id').innerText = currentActiveOrder.id;
    document.getElementById('pay-customer-name').innerText = currentActiveOrder.customerName;
    document.getElementById('pay-activation-phone').innerText = currentActiveOrder.activationPhone;
    document.getElementById('pay-package-details').innerText = `${currentActiveOrder.packageName} (${currentActiveOrder.network})`;
    document.getElementById('pay-amount-due').innerText = `${currentActiveOrder.price} جنيه`;

    goToOrderStep(3);

  } catch (err) {
    console.error('Error creating order:', err);
    alert('تعذر الاتصال بالخادم لإنشاء الطلب.');
  }
}

// Upload Payment Proof (Step 3)
async function uploadPaymentProof() {
  if (!currentActiveOrder) {
    alert('لا يوجد طلب نشط. أنشئ الطلب أولاً.');
    return;
  }

  const fileInput = document.getElementById('proof-file-input');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('ارفع صورة إيصال الدفع أولاً.');
    return;
  }

  const formData = new FormData();
  formData.append('screenshot', fileInput.files[0]);

  try {
    const res = await fetch(`/api/orders/${currentActiveOrder.id}/payment-proof`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || 'فشل رفع الإثبات');
      return;
    }

    currentActiveOrder = data.order;
    sessionStorage.setItem('megaman_active_order', JSON.stringify(currentActiveOrder));
    const successOrderId = document.getElementById('success-order-id');
    if (successOrderId) successOrderId.innerText = currentActiveOrder.id;

    const adminWhatsApp = '201150944189';
    const msg =
      `مرحباً ميجامان محارب النت ⚡\\n` +
      `رقم الطلب: ${currentActiveOrder.id}\\n` +
      `الاسم: ${currentActiveOrder.customerName}\\n` +
      `رقم التفعيل: ${currentActiveOrder.activationPhone}\\n` +
      `الشركة: ${currentActiveOrder.network}\\n` +
      `الباقة: ${currentActiveOrder.packageName}\\n` +
      `المبلغ: ${currentActiveOrder.price} جنيه\\n` +
      `تم رفع الإيصال على الموقع. سأرفق صورة الإيصال بنفسي من المعرض مع هذه الرسالة.`;

    // WhatsApp cannot attach the selected file automatically; customer must attach it manually.
    window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(msg)}`, '_blank');

    alert('تم رفع الإيصال على الموقع بنجاح. عند فتح واتساب، أرفق صورة الإيصال بنفسك من المعرض ثم اضغط إرسال. طلبك ما زال في انتظار مراجعة الدفع ولن يُعتبر الدفع مؤكداً بمجرد الرفع.');
    goToOrderStep(4);
  } catch (err) {
    console.error('Error uploading proof:', err);
    alert('حدث خطأ أثناء رفع إثبات الدفع.');
  }
}

// Track Order
async function trackOrder() {
  const query = document.getElementById('track-input').value.trim();
  if (!query) {
    alert('يرجى إدخال رقم الطلب أو رقم الهاتف');
    return;
  }
  await trackOrderWithId(query);
}

async function trackOrderWithId(id) {
  try {
    const res = await fetch(`/api/orders/track/${encodeURIComponent(id)}`);
    const data = await res.json();
    const box = document.getElementById('track-result-box');

    if (!data.success) {
      box.style.display = 'block';
      box.innerHTML = `<div style="color:#ef4444; text-align:center; padding:15px;"><i class="fa-solid fa-triangle-exclamation"></i> لم يتم العثور على طلب برقم: ${id}</div>`;
      return;
    }

    const order = data.order;
    currentActiveOrder = order;

    let statusBadgeColor = '#eab308';
    if (order.orderStatus.includes('تم تفعيلها') || order.orderStatus.includes('تم التفعيل')) statusBadgeColor = '#22c55e';
    else if (order.orderStatus.includes('مشكلة')) statusBadgeColor = '#ef4444';
    else if (order.orderStatus.includes('في انتظار التفعيل')) statusBadgeColor = '#3b82f6';

    box.style.display = 'block';
    box.innerHTML = `
      <div style="border-top:1px dashed var(--border-color); padding-top:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="color:var(--primary);">طلب رقم: ${order.id}</h4>
          <span style="background:${statusBadgeColor}22; color:${statusBadgeColor}; padding:4px 12px; border-radius:15px; font-weight:bold; font-size:0.85rem;">
            ${order.orderStatus}
          </span>
        </div>
        <div class="summary-row"><span>👤 العميل:</span> <b>${order.customerName}</b></div>
        <div class="summary-row"><span>📱 رقم التفعيل:</span> <b>${order.activationPhone}</b></div>
        <div class="summary-row"><span>📡 الشبكة:</span> <b>${order.network}</b></div>
        <div class="summary-row"><span>📦 الباقة:</span> <b>${order.packageName}</b></div>
        <div class="summary-row"><span>💰 السعر:</span> <b>${order.price} جنيه</b></div>
        <div class="summary-row"><span>💳 حالة الدفع:</span> <b>${order.paymentStatus}</b></div>
        ${order.notes ? `<div class="summary-row"><span>📝 ملاحظات:</span> <span>${order.notes}</span></div>` : ''}

        <div style="margin-top:20px; text-align:center;">
          <a href="https://wa.me/${appConfig?.settings?.whatsappNumber || '201150944189'}?text=${encodeURIComponent('استفسار عن طلبي ' + order.id)}" target="_blank" class="nav-btn primary" style="display:inline-flex; width:auto;">
            <i class="fa-brands fa-whatsapp"></i> تواصل مع خدمة العملاء بخصوص هذا الطلب
          </a>
        </div>
      </div>
    `;
    box.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Error tracking:', err);
  }
}

// User Authentication
function loadStoredUser() {
  const stored = localStorage.getItem('megaman_user');
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      updateUserUI();
    } catch (e) {
      currentUser = null;
    }
  }
}

function updateUserUI() {
  const bar = document.getElementById('user-profile-bar');
  const authBtnText = document.getElementById('auth-btn-text');

  if (currentUser) {
    bar.style.display = 'flex';
    document.getElementById('user-display-name').innerText = `مرحباً يا ${currentUser.name}`;
    document.getElementById('user-tier-badge').innerText = currentUser.tier || 'عميل جديد 🥉';
    document.getElementById('user-orders-count').innerText = currentUser.ordersCount || 0;
    document.getElementById('user-total-spent').innerText = currentUser.totalSpent || 0;
    document.getElementById('user-avatar-char').innerText = currentUser.name.charAt(0);
    authBtnText.innerText = currentUser.name.split(' ')[0];
  } else {
    bar.style.display = 'none';
    authBtnText.innerText = 'تسجيل دخول';
  }
}

let authMode = 'register';
function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-name-group').style.display = mode === 'register' ? '' : 'none';
  document.getElementById('auth-name-input').required = mode === 'register';
  document.getElementById('auth-password-input').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  document.getElementById('auth-password-input').minLength = mode === 'login' ? 1 : 8;
  document.getElementById('auth-feedback').innerText = '';
  document.getElementById('auth-submit-btn').innerHTML = mode === 'login'
    ? '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول'
    : '<i class="fa-solid fa-user-plus"></i> إنشاء حساب';
  document.getElementById('auth-tab-register').style.background = mode === 'register' ? '' : '#64748b';
  document.getElementById('auth-tab-login').style.background = mode === 'login' ? '' : '#64748b';
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('auth-name-input').value.trim();
  const phone = document.getElementById('auth-phone-input').value.trim();
  const password = document.getElementById('auth-password-input').value;
  const feedback = document.getElementById('auth-feedback');
  const button = document.getElementById('auth-submit-btn');
  feedback.innerText = 'جاري المعالجة...';
  button.disabled = true;
  try {
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login' ? { phone, password } : { name, phone, password };
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر إكمال العملية.');
    currentUser = data.customer;
    localStorage.setItem('megaman_user', JSON.stringify(currentUser));
    updateUserUI();
    closeModal('auth-modal');
    document.getElementById('auth-form').reset();
    setAuthMode('register');
    alert(data.message || (authMode === 'login' ? 'تم تسجيل الدخول بنجاح.' : 'تم إنشاء الحساب بنجاح.'));
  } catch (err) {
    feedback.innerText = err.message || 'حدث خطأ في الاتصال';
  } finally {
    button.disabled = false;
  }
}

function openResetPassword() {
  const phone = document.getElementById('auth-phone-input').value.trim();
  document.getElementById('reset-phone').value = phone;
  document.getElementById('reset-feedback').innerText = '';
  openModal('reset-password-modal');
}

async function requestPasswordResetOtp() {
  const phone = document.getElementById('reset-phone').value.trim();
  const feedback = document.getElementById('reset-feedback');
  feedback.innerText = 'جاري إرسال رمز التحقق...';
  try {
    const res = await fetch('/api/auth/request-password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر إرسال الرمز.');
    feedback.innerText = data.message || 'تم إرسال الرمز.';
  } catch (e) { feedback.innerText = e.message; }
}

async function submitPasswordReset(event) {
  event.preventDefault();
  const payload = { phone: document.getElementById('reset-phone').value.trim(), otp: document.getElementById('reset-otp').value.trim(), password: document.getElementById('reset-new-password').value };
  const feedback = document.getElementById('reset-feedback');
  feedback.innerText = 'جاري تغيير كلمة المرور...';
  try {
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر تغيير كلمة المرور.');
    feedback.innerText = data.message || 'تم تغيير كلمة المرور.';
    setTimeout(() => { closeModal('reset-password-modal'); setAuthMode('login'); openModal('auth-modal'); }, 900);
  } catch (e) { feedback.innerText = e.message; }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('megaman_user');
  updateUserUI();
}

// View Past Orders Modal
async function openMyOrdersModal() {
  if (!currentUser) return;
  const listContainer = document.getElementById('past-orders-list');
  listContainer.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';
  openModal('my-orders-modal');

  try {
    const res = await fetch(`/api/customer/${currentUser.phone}`);
    const data = await res.json();

    if (!data.orders || data.orders.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">لم تقم بأي طلبات بعد. اختر باقتك الآن واستفد من الخصومات!</div>';
      return;
    }

    listContainer.innerHTML = data.orders.map(o => `
      <div style="background:var(--bg-dark); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <b style="color:var(--primary);">${o.id}</b>
          <span style="font-size:0.8rem; font-weight:bold; color:#10b981;">${o.orderStatus}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted);">${o.network} - ${o.packageName} (${o.price} ج)</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">تاريخ الطلب: ${(o.createdAt || '').slice(0, 10)}</div>
      </div>
    `).join('');
  } catch (err) {
    listContainer.innerHTML = '<div style="color:#ef4444; padding:15px;">تعذر تحميل السجل</div>';
  }
}

// Vodafone Flex Inquiry Modal
function openVodafoneInquiryModal(defaultPkg = '5200 Flex') {
  if (currentUser) {
    document.getElementById('vf-inquiry-name').value = currentUser.name;
    document.getElementById('vf-inquiry-phone').value = currentUser.phone;
  }
  document.getElementById('vf-inquiry-pkg').value = defaultPkg;
  openModal('vodafone-modal');
}

function submitVodafoneInquiry() {
  const name = document.getElementById('vf-inquiry-name').value.trim();
  const phone = document.getElementById('vf-inquiry-phone').value.trim();
  const pkg = document.getElementById('vf-inquiry-pkg').value;

  if (!phone) {
    alert('الرجاء إدخال رقم هاتف فودافون للاستفسار');
    return;
  }

  const adminWhatsApp = '201150944189';
  const msg = `مرحباً فريق وفر نت / ميجامان 🔴
أريد الاستفسار عن أفضل سعر وعرض متاح لباقة فودافون فليكس:
👤 الاسم: ${name || 'عميل وفر نت'}
📱 رقم الخط: ${phone}
📦 الباقة: ${pkg}
برجاء إفادتي بالسعر وطريقة التفعيل.`;

  window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(msg)}`, '_blank');
  closeModal('vodafone-modal');
}

// Clipboard Helper
function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert(`تم نسخ: ${text} إلى الحافظة بنجاح!`);
  });
}

// Modal helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function openAuthModal() {
  openModal('auth-modal');
}
