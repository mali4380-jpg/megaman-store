// Global State
let appConfig = null;
let currentNetwork = 'WE';
let currentUser = null;
let selectedPackage = null;
let currentActiveOrder = null;
let pendingPackageAfterLogin = null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  loadStoredUser();
  await fetchConfig();
  selectNetwork(currentNetwork);

  if (sessionStorage.getItem('megaman_active_order')) {
    try {
      currentActiveOrder = JSON.parse(
        sessionStorage.getItem('megaman_active_order')
      );
    } catch (err) {
      console.error('Failed to restore active order:', err);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('track');

  if (trackId) {
    const trackInput = document.getElementById('track-input');
    if (trackInput) trackInput.value = trackId;
    trackOrderWithId(trackId);
  }
});

// 1. Fetch Configuration & Packages
async function fetchConfig() {
  try {
    const res = await fetch('/api/config', {
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    appConfig = await res.json();

    if (appConfig.settings) {
      const instapay = document.getElementById('instapay-val');
      const wallet = document.getElementById('wallet-val');
      const whatsapp = document.getElementById('floating-whatsapp-btn');

      if (instapay) instapay.innerText = '01009668613';
      if (wallet) wallet.innerText = '01009668613';

      if (whatsapp) {
        whatsapp.href =
          'https://wa.me/201150944189?text=' +
          encodeURIComponent(
            'مرحباً ميجامان، أريد الاستفسار عن باقات النت'
          );
      }
    }
  } catch (err) {
    console.error('Failed to load configuration:', err);
  }
}

// 2. Select Network
function selectNetwork(network) {
  currentNetwork = network;

  document.querySelectorAll('.network-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.querySelector(
    `.network-tab-btn.${network.toLowerCase()}`
  );

  if (activeBtn) activeBtn.classList.add('active');

  const vfBanner = document.getElementById('vodafone-info-banner');
  if (vfBanner) vfBanner.style.display = 'none';

  const featureImage = document.getElementById('network-feature-image');
  const instructions = document.getElementById('network-instructions');

  const networkInfo = {
    WE: {
      image: 'images/we-packages.jpeg',
      alt: 'باقات وي جولد',
      title: 'تعليمات باقات WE Gold',
      items: [
        'التجديد رسمي على نفس الخط دون تغيير الشريحة.',
        'متاح لخطوط WE الفردية، ولا يشمل خطوط تكافل وكرامة أو التربية والتعليم أو حياة كريمة.',
        'تأكد أن الخط يستقبل المكالمات ولا يوجد استلاف رصيد يمنع نزول الباقة.',
        'مواعيد الطلب: قبل يوم 1 أو يوم 15 من الشهر.'
      ]
    },
    ETISALAT: {
      image: 'images/etisalat-packages.jpeg',
      alt: 'باقات اتصالات أميرالد VIP',
      title: 'تعليمات باقات اتصالات أميرالد VIP',
      items: [
        'يجب أن يكون الخط على نظام 14 قرش.',
        'يشترط خلو الخط من المديونية أو استلاف الرصيد.',
        'يجب أن يكون الخط مسجلاً باسم العميل بالرقم القومي.',
        'التفعيل يوم 1 أو يوم 15 من الشهر، والعدد محدود بكل دورة.',
        'المحاسبة دقيقة بدقيقة لأي شبكة وميجا بميجا لأي موقع.'
      ]
    },
    VODAFONE: {
      image: 'images/vodafone-packages.jpeg',
      alt: 'باقات فودافون ريد',
      title: 'تعليمات باقات فودافون ريد',
      items: [
        'مواعيد التجديد يوم 10 ويوم 25 من الشهر الساعة 12 مساءً.',
        'الاشتراك المبكر يمنح 3 جيجا + 1000 دقيقة حتى موعد التجديد.',
        'يلزم رقم الخط وكلمة مرور تطبيق أنا فودافون، والاستمرار 6 شهور.',
        'يشترط رصيد كافٍ وعدم وجود استلاف أو مديونية.',
        'لا يمكن تغيير الباقة بعد الربط، وتوجد ضريبة حكومية 22 جنيهاً كل 6 شهور.',
        'المحاسبة دقيقة بدقيقة لكل الشبكات وميجا بميجا لأي موقع.'
      ]
    },
    ORANGE: {
      image: 'images/orange-packages.jpeg',
      alt: 'باقات أورنج الشهرية',
      title: 'تعليمات عروض أورنج الشهرية',
      items: [
        'صلاحية الباقة 30 يوماً من تاريخ التفعيل.',
        'التجديد الرسمي على نفس الشريحة دون تغيير الخط.',
        'المحاسبة دقيقة بدقيقة وميجا بميجا.',
        'ألغِ أي باقة إنترنت قديمة منتهية لتجنب تضارب التجديد التلقائي.',
        'مواعيد الطلب: قبل يوم 1 أو يوم 15 من الشهر.'
      ]
    }
  };

  const info = networkInfo[network];

  if (featureImage && info) {
    featureImage.src = info.image;
    featureImage.alt = info.alt;
  }

  if (instructions && info) {
    instructions.innerHTML = `
      <h4>${info.title}</h4>
      <ul>${info.items.map(item => `<li>${item}</li>`).join('')}</ul>
    `;
  }

  renderPackages(network);
}

// 3. Render Package Cards
function renderPackages(network) {
  const container = document.getElementById('packages-container');

  if (!container || !appConfig || !appConfig.packages) return;

  const packages = appConfig.packages[network] || [];
  container.innerHTML = '';

  packages.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'package-card';

    const savingAmount =
      pkg.originalPrice && pkg.price
        ? pkg.originalPrice - pkg.price
        : 0;

    const savingPercent =
      pkg.originalPrice && pkg.price
        ? Math.round((savingAmount / pkg.originalPrice) * 100)
        : 30;

    card.innerHTML = `
      ${pkg.popular ? `
        <div class="package-badge-popular">
          <i class="fa-solid fa-fire"></i> الأكثر طلباً
        </div>
      ` : ''}

      <div class="package-header">
        <h4>${pkg.name}</h4>
      </div>

      <div class="package-specs">
        <div class="spec-item">
          <i class="fa-solid fa-wifi" style="color:var(--primary);"></i>
          ${pkg.data}
        </div>
        <div class="spec-item">
          <i class="fa-solid fa-phone" style="color:#10b981;"></i>
          ${pkg.minutes}
        </div>
      </div>

      <div class="package-pricing">
        <div class="price-main">
          ${pkg.isCustomPrice ? `
            <span class="price-num" style="font-size:1.3rem;color:#ff5252;">
              ${pkg.priceText || 'حسب العرض'}
            </span>
          ` : `
            <span class="price-num">${pkg.price}</span>
            <span class="price-unit">جنيه مصري</span>
            ${pkg.originalPrice ? `
              <span class="price-original">${pkg.originalPrice} ج</span>
            ` : ''}
          `}
        </div>

        ${savingAmount > 0 ? `
          <div class="saving-tag">
            <i class="fa-solid fa-tag"></i>
            وفر ${savingAmount} جنيه (${savingPercent}% خصم)
          </div>
        ` : ''}
      </div>

      <button class="btn-select-pkg"
        onclick='initOrderPackage(${JSON.stringify(pkg).replace(/'/g, '&apos;')})'>
        <i class="fa-solid fa-bolt"></i>
        ${pkg.isCustomPrice
          ? 'استفسر عن السعر الآن'
          : 'اختر الباقة واحجز الآن'}
      </button>
    `;

    container.appendChild(card);
  });
}

// 4. Order Initiation - LOGIN REQUIRED
function initOrderPackage(pkg) {
  if (!currentUser) {
    pendingPackageAfterLogin = {
      pkg,
      network: currentNetwork
    };

    alert('لازم تسجل دخول أو تنشئ حساب الأول عشان تختار باقة.');

    setAuthMode('login');
    openAuthModal();
    return;
  }

  if (pkg.isCustomPrice) {
    openVodafoneInquiryModal(pkg.name);
    return;
  }

  selectedPackage = pkg;

  document.getElementById('summary-network-badge').innerText =
    currentNetwork;

  document.getElementById('summary-package-name').innerText =
    pkg.name;

  document.getElementById('summary-package-price').innerText =
    `${pkg.price} جنيه مصري`;

  document.getElementById('order-customer-name').value =
    currentUser.name || '';

  document.getElementById('order-activation-phone').value =
    currentUser.phone || '';

  goToOrderStep(1);
  openModal('order-modal');
}

// Order Wizard Navigation
function goToOrderStep(step) {
  for (let i = 1; i <= 4; i++) {
    const section = document.getElementById(`order-step-${i}`);
    if (section) {
      section.style.display = i === step ? 'block' : 'none';
    }
  }
}

let isSameWhatsAppNumber = true;

function setSameWhatsApp(isSame) {
  isSameWhatsAppNumber = isSame;

  const yesBtn = document.getElementById('same-phone-yes');
  const noBtn = document.getElementById('same-phone-no');
  const diffGroup = document.getElementById('diff-whatsapp-group');

  if (yesBtn) yesBtn.classList.toggle('active', isSame);
  if (noBtn) noBtn.classList.toggle('active', !isSame);
  if (diffGroup) diffGroup.style.display = isSame ? 'none' : 'block';
}

// 5. Submit Order
async function submitOrderDetails() {
  if (!currentUser) {
    alert('لازم تسجل دخول الأول لإتمام الطلب.');
    openAuthModal();
    return;
  }

  if (!selectedPackage) {
    alert('اختار الباقة الأول.');
    return;
  }

  const customerName =
    document.getElementById('order-customer-name').value.trim();

  const activationPhone =
    document.getElementById('order-activation-phone').value.trim();

  let whatsappPhone = activationPhone;

  if (!isSameWhatsAppNumber) {
    whatsappPhone =
      document.getElementById('order-whatsapp-phone').value.trim();
  }

  if (!customerName || !activationPhone) {
    alert('الرجاء إدخال اسمك ورقم الهاتف المراد تفعيل الباقة عليه بشكل صحيح.');
    return;
  }

  if (!/^01[0125][0-9]{8}$/.test(activationPhone)) {
    alert('رقم هاتف التفعيل غير صحيح! تأكد أنه يبدأ بـ 010 أو 011 أو 012 أو 015 ومكون من 11 رقماً.');
    return;
  }

  if (!/^01[0125][0-9]{8}$/.test(whatsappPhone)) {
    alert('رقم واتساب غير صحيح.');
    return;
  }

  try {
    const payload = {
      customerName,
      customerPhone: currentUser.phone,
      activationPhone,
      whatsappPhone,
      network: currentNetwork,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      price: selectedPackage.price,
      paymentMethod: 'InstaPay / محفظة إلكترونية'
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || 'حدث خطأ أثناء حجز الباقة');
      return;
    }

    currentActiveOrder = data.order;

    sessionStorage.setItem(
      'megaman_active_order',
      JSON.stringify(currentActiveOrder)
    );

    document.getElementById('pay-order-id').innerText =
      currentActiveOrder.id;

    document.getElementById('pay-customer-name').innerText =
      currentActiveOrder.customerName;

    document.getElementById('pay-activation-phone').innerText =
      currentActiveOrder.activationPhone;

    document.getElementById('pay-package-details').innerText =
      `${currentActiveOrder.packageName} (${currentActiveOrder.network})`;

    document.getElementById('pay-amount-due').innerText =
      `${currentActiveOrder.price} جنيه`;

    goToOrderStep(3);

  } catch (err) {
    console.error('Error creating order:', err);
    alert('تعذر الاتصال بالخادم لإنشاء الطلب.');
  }
}

// 6. Upload Payment Proof
async function uploadPaymentProof() {
  if (!currentActiveOrder) {
    alert('لا يوجد طلب نشط. أنشئ الطلب أولاً.');
    return;
  }

  const fileInput = document.getElementById('proof-file-input');

  if (!fileInput?.files?.length) {
    alert('ارفع صورة إيصال الدفع أولاً.');
    return;
  }

  const formData = new FormData();
  formData.append('screenshot', fileInput.files[0]);

  try {
    const res = await fetch(
      `/api/orders/${encodeURIComponent(currentActiveOrder.id)}/payment-proof`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || 'فشل رفع الإثبات');
      return;
    }

    currentActiveOrder = data.order;

    sessionStorage.setItem(
      'megaman_active_order',
      JSON.stringify(currentActiveOrder)
    );

    const successOrderId = document.getElementById('success-order-id');
    if (successOrderId) {
      successOrderId.innerText = currentActiveOrder.id;
    }

    const adminWhatsApp = '201150944189';

    const msg = `مرحباً ميجامان محارب النت ⚡
رقم الطلب: ${currentActiveOrder.id}
الاسم: ${currentActiveOrder.customerName}
رقم التفعيل: ${currentActiveOrder.activationPhone}
الشركة: ${currentActiveOrder.network}
الباقة: ${currentActiveOrder.packageName}
المبلغ: ${currentActiveOrder.price} جنيه
تم رفع الإيصال على الموقع. سأرفق صورة الإيصال بنفسي من المعرض مع هذه الرسالة.`;

    window.open(
      `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );

    alert(
      'تم رفع الإيصال على الموقع بنجاح. عند فتح واتساب، أرفق صورة الإيصال بنفسك من المعرض ثم اضغط إرسال. طلبك ما زال في انتظار مراجعة الدفع.'
    );

    goToOrderStep(4);

  } catch (err) {
    console.error('Error uploading proof:', err);
    alert('حدث خطأ أثناء رفع إثبات الدفع.');
  }
}

// 7. Track Order
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
    const res = await fetch(
      `/api/orders/track/${encodeURIComponent(id)}`
    );

    const data = await res.json();
    const box = document.getElementById('track-result-box');

    if (!box) return;

    if (!data.success) {
      box.style.display = 'block';
      box.innerHTML = `
        <div style="color:#ef4444;text-align:center;padding:15px;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          لم يتم العثور على طلب برقم: ${id}
        </div>
      `;
      return;
    }

    const order = data.order;
    currentActiveOrder = order;

    let statusBadgeColor = '#eab308';

    if (
      order.orderStatus.includes('تم تفعيلها') ||
      order.orderStatus.includes('تم التفعيل')
    ) {
      statusBadgeColor = '#22c55e';
    } else if (order.orderStatus.includes('مشكلة')) {
      statusBadgeColor = '#ef4444';
    } else if (order.orderStatus.includes('في انتظار التفعيل')) {
      statusBadgeColor = '#3b82f6';
    }

    box.style.display = 'block';

    box.innerHTML = `
      <div style="border-top:1px dashed var(--border-color);padding-top:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h4 style="color:var(--primary);">طلب رقم: ${order.id}</h4>
          <span style="background:${statusBadgeColor}22;color:${statusBadgeColor};padding:4px 12px;border-radius:15px;font-weight:bold;font-size:0.85rem;">
            ${order.orderStatus}
          </span>
        </div>

        <div class="summary-row">
          <span>👤 العميل:</span><b>${order.customerName}</b>
        </div>
        <div class="summary-row">
          <span>📱 رقم التفعيل:</span><b>${order.activationPhone}</b>
        </div>
        <div class="summary-row">
          <span>📡 الشبكة:</span><b>${order.network}</b>
        </div>
        <div class="summary-row">
          <span>📦 الباقة:</span><b>${order.packageName}</b>
        </div>
        <div class="summary-row">
          <span>💰 السعر:</span><b>${order.price} جنيه</b>
        </div>
        <div class="summary-row">
          <span>💳 حالة الدفع:</span><b>${order.paymentStatus}</b>
        </div>

        ${order.notes ? `
          <div class="summary-row">
            <span>📝 ملاحظات:</span><span>${order.notes}</span>
          </div>
        ` : ''}

        <div style="margin-top:20px;text-align:center;">
          <a href="https://wa.me/${appConfig?.settings?.whatsappNumber || '201150944189'}?text=${encodeURIComponent('استفسار عن طلبي ' + order.id)}"
             target="_blank"
             class="nav-btn primary"
             style="display:inline-flex;width:auto;">
            <i class="fa-brands fa-whatsapp"></i>
            تواصل مع خدمة العملاء بخصوص هذا الطلب
          </a>
        </div>
      </div>
    `;

    box.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Error tracking:', err);
  }
}

// 8. User Authentication
function loadStoredUser() {
  const stored = localStorage.getItem('megaman_user');

  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      updateUserUI();
    } catch (err) {
      currentUser = null;
      localStorage.removeItem('megaman_user');
    }
  }
}

function updateUserUI() {
  const bar = document.getElementById('user-profile-bar');
  const authBtnText = document.getElementById('auth-btn-text');

  if (currentUser) {
    if (bar) bar.style.display = 'flex';

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };

    setText('user-display-name', `مرحباً يا ${currentUser.name}`);
    setText('user-tier-badge', currentUser.tier || 'عميل جديد 🥉');
    setText('user-orders-count', currentUser.ordersCount || 0);
    setText('user-total-spent', currentUser.totalSpent || 0);
    setText('user-avatar-char', currentUser.name.charAt(0));

    if (authBtnText) {
      authBtnText.innerText = currentUser.name.split(' ')[0];
    }
  } else {
    if (bar) bar.style.display = 'none';
    if (authBtnText) authBtnText.innerText = 'تسجيل دخول';
  }
}

let authMode = 'register';

function setAuthMode(mode) {
  authMode = mode;

  document.getElementById('auth-name-group').style.display =
    mode === 'register' ? '' : 'none';

  document.getElementById('auth-name-input').required =
    mode === 'register';

  document.getElementById('auth-password-input').autocomplete =
    mode === 'login' ? 'current-password' : 'new-password';

  document.getElementById('auth-password-input').minLength =
    mode === 'login' ? 1 : 8;

  document.getElementById('auth-feedback').innerText = '';

  document.getElementById('auth-submit-btn').innerHTML =
    mode === 'login'
      ? '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول'
      : '<i class="fa-solid fa-user-plus"></i> إنشاء حساب';

  document.getElementById('auth-tab-register').style.background =
    mode === 'register' ? '' : '#64748b';

  document.getElementById('auth-tab-login').style.background =
    mode === 'login' ? '' : '#64748b';
}

// 9. Login / Register
async function handleAuthSubmit(event) {
  event.preventDefault();

  const mode = authMode;

  const name =
    document.getElementById('auth-name-input').value.trim();

  const phone =
    document.getElementById('auth-phone-input').value.trim();

  const password =
    document.getElementById('auth-password-input').value;

  const feedback =
    document.getElementById('auth-feedback');

  const button =
    document.getElementById('auth-submit-btn');

  feedback.innerText = 'جاري المعالجة...';
  button.disabled = true;

  try {
    const endpoint =
      mode === 'login'
        ? '/api/auth/login'
        : '/api/auth/register';

    const payload =
      mode === 'login'
        ? { phone, password }
        : { name, phone, password };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.error || 'تعذر إكمال العملية.'
      );
    }

    currentUser = data.customer;

    localStorage.setItem(
      'megaman_user',
      JSON.stringify(currentUser)
    );

    updateUserUI();
    closeModal('auth-modal');

    document.getElementById('auth-form').reset();
    setAuthMode('register');

    alert(
      data.message ||
      (mode === 'login'
        ? 'تم تسجيل الدخول بنجاح.'
        : 'تم إنشاء الحساب بنجاح.')
    );

    // Continue the selected package after login
    if (pendingPackageAfterLogin) {
      const pending = pendingPackageAfterLogin;
      pendingPackageAfterLogin = null;

      if (pending.network !== currentNetwork) {
        selectNetwork(pending.network);
      }

      initOrderPackage(pending.pkg);
    }

  } catch (err) {
    feedback.innerText =
      err.message || 'حدث خطأ في الاتصال';
  } finally {
    button.disabled = false;
  }
}

// 10. Password Reset
function openResetPassword() {
  const phone =
    document.getElementById('auth-phone-input').value.trim();

  document.getElementById('reset-phone').value = phone;
  document.getElementById('reset-feedback').innerText = '';

  openModal('reset-password-modal');
}

async function requestPasswordResetOtp() {
  const phone =
    document.getElementById('reset-phone').value.trim();

  const feedback =
    document.getElementById('reset-feedback');

  feedback.innerText = 'جاري إرسال رمز التحقق...';

  try {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'تعذر إرسال الرمز.');
    }

    feedback.innerText =
      data.message || 'تم إرسال الرمز.';

  } catch (err) {
    feedback.innerText = err.message;
  }
}

async function submitPasswordReset(event) {
  event.preventDefault();

  const payload = {
    phone: document.getElementById('reset-phone').value.trim(),
    otp: document.getElementById('reset-otp').value.trim(),
    password: document.getElementById('reset-new-password').value
  };

  const feedback =
    document.getElementById('reset-feedback');

  feedback.innerText = 'جاري تغيير كلمة المرور...';

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'تعذر تغيير كلمة المرور.');
    }

    feedback.innerText =
      data.message || 'تم تغيير كلمة المرور.';

    setTimeout(() => {
      closeModal('reset-password-modal');
      setAuthMode('login');
      openModal('auth-modal');
    }, 900);

  } catch (err) {
    feedback.innerText = err.message;
  }
}

// 11. Logout
function logoutUser() {
  currentUser = null;
  pendingPackageAfterLogin = null;

  localStorage.removeItem('megaman_user');
  updateUserUI();
}

// 12. My Orders
async function openMyOrdersModal() {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  const listContainer =
    document.getElementById('past-orders-list');

  listContainer.innerHTML =
    '<div style="text-align:center;padding:20px;">جاري التحميل...</div>';

  openModal('my-orders-modal');

  try {
    const res = await fetch(
      `/api/customer/${encodeURIComponent(currentUser.phone)}`
    );

    const data = await res.json();

    if (!data.orders || data.orders.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center;color:var(--text-muted);padding:20px;">
          لم تقم بأي طلبات بعد. اختر باقتك الآن واستفد من الخصومات!
        </div>
      `;
      return;
    }

    listContainer.innerHTML = data.orders.map(o => `
      <div style="background:var(--bg-dark);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <b style="color:var(--primary);">${o.id}</b>
          <span style="font-size:0.8rem;font-weight:bold;color:#10b981;">
            ${o.orderStatus}
          </span>
        </div>

        <div style="font-size:0.85rem;color:var(--text-muted);">
          ${o.network} - ${o.packageName} (${o.price} ج)
        </div>

        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
          تاريخ الطلب: ${(o.createdAt || '').slice(0, 10)}
        </div>
      </div>
    `).join('');

  } catch (err) {
    listContainer.innerHTML =
      '<div style="color:#ef4444;padding:15px;">تعذر تحميل السجل</div>';
  }
}

// 13. Vodafone Inquiry
function openVodafoneInquiryModal(defaultPkg = '5200 Flex') {
  if (currentUser) {
    document.getElementById('vf-inquiry-name').value =
      currentUser.name;

    document.getElementById('vf-inquiry-phone').value =
      currentUser.phone;
  }

  document.getElementById('vf-inquiry-pkg').value =
    defaultPkg;

  openModal('vodafone-modal');
}

function submitVodafoneInquiry() {
  const name =
    document.getElementById('vf-inquiry-name').value.trim();

  const phone =
    document.getElementById('vf-inquiry-phone').value.trim();

  const pkg =
    document.getElementById('vf-inquiry-pkg').value;

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

  window.open(
    `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(msg)}`,
    '_blank'
  );

  closeModal('vodafone-modal');
}

// 14. Clipboard Helper
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const text = element.innerText;

  navigator.clipboard.writeText(text).then(() => {
    alert(`تم نسخ: ${text} إلى الحافظة بنجاح!`);
  }).catch(() => {
    alert('تعذر النسخ تلقائيًا.');
  });
}

// 15. Modal Helpers
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
