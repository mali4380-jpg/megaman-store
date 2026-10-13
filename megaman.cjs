const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const XLSX = require('xlsx');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Public pages are served by the separate Vite artifact.
// Admin API routes require a server-side session token.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_TOKEN = require('crypto').randomBytes(32).toString('hex');

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const part = header.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function requireAdmin(req, res, next) {
  if (getCookie(req, 'admin_session') === ADMIN_SESSION_TOKEN) return next();
  return res.status(401).json({ error: 'غير مصرح. سجل دخول الإدارة أولاً.' });
}

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ success: false, error: 'إدارة الموقع غير مفعّلة. أضف ADMIN_PASSWORD إلى الأسرار أولاً.' });
  }
  const password = String(req.body?.password || '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
  }
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `admin_session=${encodeURIComponent(ADMIN_SESSION_TOKEN)}; HttpOnly; SameSite=Strict; Path=/${secure}`);
  res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ success: true });
});

app.use('/api/admin', requireAdmin);

const DATA_DIR = process.env.MEGAMAN_DATA_DIR || path.join(process.cwd(), 'data', 'megaman');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
app.use('/api/uploads', express.static(UPLOAD_DIR));

// Storage setup for Multer (Payment Proofs)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'proof-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// JSON Database Setup
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultData = {
  settings: {
    brandName: "ميجامان محارب النت",
    subTitle: "تجديد رسمي لجميع باقات الإنترنت والمكالمات بخصم يصل لـ 35%",
    whatsappNumber: "201150944189",
    whatsappGroupLink: "https://chat.whatsapp.com/example",
    telegramChannelLink: "https://t.me/megaman_net",
    instapayAddress: "01009668613",
    vodafoneCashNumber: "01009668613",
    orangeCashNumber: "012XXXXXXXX",
    etisalatCashNumber: "011XXXXXXXX",
    wePayNumber: "015XXXXXXXX",
    supplierCommissionRate: 0.15, // هامش الربح التقريبي
    workingHours: "من 10 صباحاً حتى 12 منتصف الليل"
  },
  packages: {
    WE: [
      { id: "we-1", name: "15 جيجا + 1000 دقيقة", data: "15 GB", minutes: "1000 دقيقة", price: 230, originalPrice: 330, popular: false },
      { id: "we-2", name: "20 جيجا + 1300 دقيقة", data: "20 GB", minutes: "1300 دقيقة", price: 270, originalPrice: 380, popular: false },
      { id: "we-3", name: "30 جيجا + 1700 دقيقة", data: "30 GB", minutes: "1700 دقيقة", price: 340, originalPrice: 480, popular: true },
      { id: "we-4", name: "40 جيجا + 2000 دقيقة", data: "40 GB", minutes: "2000 دقيقة", price: 440, originalPrice: 620, popular: false },
      { id: "we-5", name: "50 جيجا + 2000 دقيقة", data: "50 GB", minutes: "2000 دقيقة", price: 520, originalPrice: 750, popular: false },
      { id: "we-6", name: "60 جيجا + 2000 دقيقة", data: "60 GB", minutes: "2000 دقيقة", price: 560, originalPrice: 790, popular: false },
      { id: "we-7", name: "70 جيجا + 2000 دقيقة", data: "70 GB", minutes: "2000 دقيقة", price: 610, originalPrice: 860, popular: false }
    ],
    ETISALAT: [
      { id: "et-1", name: "14 جيجا + 1500 دقيقة", data: "14 GB", minutes: "1500 دقيقة", price: 260, originalPrice: 370, popular: false },
      { id: "et-2", name: "20 جيجا + 1500 دقيقة", data: "20 GB", minutes: "1500 دقيقة", price: 330, originalPrice: 460, popular: false },
      { id: "et-3", name: "25 جيجا + 1500 دقيقة", data: "25 GB", minutes: "1500 دقيقة", price: 360, originalPrice: 510, popular: true },
      { id: "et-4", name: "30 جيجا + 1500 دقيقة", data: "30 GB", minutes: "1500 دقيقة", price: 380, originalPrice: 550, popular: false },
      { id: "et-5", name: "35 جيجا + 1500 دقيقة", data: "35 GB", minutes: "1500 دقيقة", price: 440, originalPrice: 600, popular: false },
      { id: "et-6", name: "40 جيجا + 1500 دقيقة", data: "40 GB", minutes: "1500 دقيقة", price: 490, originalPrice: 660, popular: false },
      { id: "et-7", name: "50 جيجا + 2000 دقيقة", data: "50 GB", minutes: "2000 دقيقة", price: 560, originalPrice: 740, popular: false }
    ],
    ORANGE: [
      { id: "or-1", name: "10 جيجا + 2000 دقيقة", data: "10 GB", minutes: "2000 دقيقة", price: 250, originalPrice: 350, popular: false },
      { id: "or-2", name: "14 جيجا + 2000 دقيقة", data: "14 GB", minutes: "2000 دقيقة", price: 300, originalPrice: 420, popular: false },
      { id: "or-3", name: "20 جيجا + 2000 دقيقة", data: "20 GB", minutes: "2000 دقيقة", price: 380, originalPrice: 540, popular: true },
      { id: "or-4", name: "30 جيجا + 2000 دقيقة", data: "30 GB", minutes: "2000 دقيقة", price: 490, originalPrice: 690, popular: false },
      { id: "or-5", name: "2000 دقيقة فقط (مكالمات)", data: "بدون إنترنت", minutes: "2000 دقيقة", price: 150, originalPrice: 220, popular: false }
    ],
    VODAFONE: [
      { id: "vf-1", name: "20 جيجا + 2000 دقيقة", data: "20 GB", minutes: "2000 دقيقة", price: 300, originalPrice: 350, popular: false },
      { id: "vf-2", name: "30 جيجا + 3000 دقيقة", data: "30 GB", minutes: "3000 دقيقة", price: 370, originalPrice: 420, popular: false },
      { id: "vf-3", name: "40 جيجا + 4000 دقيقة", data: "40 GB", minutes: "4000 دقيقة", price: 430, originalPrice: 480, popular: false },
      { id: "vf-4", name: "50 جيجا + 5000 دقيقة", data: "50 GB", minutes: "5000 دقيقة", price: 500, originalPrice: 550, popular: false },
      { id: "vf-5", name: "60 جيجا + 6000 دقيقة", data: "60 GB", minutes: "6000 دقيقة", price: 570, originalPrice: 620, popular: false },
      { id: "vf-6", name: "70 جيجا + 7000 دقيقة", data: "70 GB", minutes: "7000 دقيقة", price: 630, originalPrice: 680, popular: false },
      { id: "vf-7", name: "90 جيجا + 9000 دقيقة", data: "90 GB", minutes: "9000 دقيقة", price: 700, originalPrice: 750, popular: false },
      { id: "vf-8", name: "150 جيجا + 10000 دقيقة", data: "150 GB", minutes: "10000 دقيقة", price: 900, originalPrice: 950, popular: true }
    ]
  },
  orders: [],
  customers: {},
  aiReconciliations: []
};

// Helper functions for DB reading & writing
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    throw err;
  }
}

function writeDB(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    throw err;
  }
}

// Ensure DB exists on boot
readDB();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Get Settings & Packages
app.get('/api/config', (req, res) => {
  const db = readDB();
  res.json({
    settings: db.settings,
    packages: db.packages
  });
});

// Update Settings (Admin)
app.post('/api/admin/settings', (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// 2. Customer account registration, WhatsApp OTP verification and password login
const pendingCustomerOtps = new Map();
const otpAttempts = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_TEMPLATE_NAME = process.env.WHATSAPP_OTP_TEMPLATE || 'customer_account_otp';
const OTP_TEMPLATE_LANGUAGE = process.env.WHATSAPP_OTP_LANGUAGE || 'en_US';

function normalizeEgyptPhone(value) {
  let phone = String(value || '').replace(/[\s()+-]/g, '');
  if (phone.startsWith('0020')) phone = '0' + phone.slice(4);
  if (phone.startsWith('20') && phone.length === 12) phone = '0' + phone.slice(2);
  return /^01[0125]\d{8}$/.test(phone) ? phone : null;
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expected] = stored.split(':');
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}
async function sendWhatsAppOtp(phone, otp) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    const err = new Error('إرسال رمز واتساب غير مفعّل بعد. يلزم إعداد WhatsApp Cloud API في ملف البيئة.');
    err.status = 503;
    throw err;
  }
  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: `20${phone.slice(1)}`, type: 'template',
      template: { name: OTP_TEMPLATE_NAME, language: { code: OTP_TEMPLATE_LANGUAGE },
        components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] },
          { type: 'button', sub_type: 'copy_code', index: '0', parameters: [{ type: 'payload', payload: otp }] }] }
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('WhatsApp OTP send failed:', result);
    const err = new Error('تعذر إرسال رمز التأكيد على واتساب. راجع إعدادات قالب OTP في Meta.');
    err.status = 502;
    throw err;
  }
}

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = normalizeEgyptPhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!name || name.length < 2 || !phone || password.length < 8) {
    return res.status(400).json({ error: 'أدخل الاسم ورقم واتساب مصري صحيح وكلمة مرور لا تقل عن 8 أحرف.' });
  }
  const db = readDB();
  const existing = db.customers[phone];
  if (existing?.passwordHash) {
    return res.status(409).json({ error: 'الرقم مسجل بالفعل. استخدم تسجيل الدخول.' });
  }
  const customer = {
    ...(existing || {}), name, phone, passwordHash: hashPassword(password),
    whatsappVerified: false, ordersCount: Number(existing?.ordersCount || 0),
    totalSpent: Number(existing?.totalSpent || 0), tier: existing?.tier || 'عميل جديد 🥉',
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  db.customers[phone] = customer;
  writeDB(db);
  const { passwordHash, ...safeCustomer } = customer;
  return res.json({ success: true, customer: safeCustomer, message: 'تم إنشاء حسابك بنجاح.' });
});

app.post('/api/auth/request-otp', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = normalizeEgyptPhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!name || name.length < 2 || !phone || password.length < 8) {
    return res.status(400).json({ error: 'أدخل الاسم ورقم واتساب مصري صحيح وكلمة مرور لا تقل عن 8 أحرف.' });
  }
  const db = readDB();
  const existing = db.customers[phone];
  if (existing?.passwordHash && existing?.whatsappVerified) {
    return res.status(409).json({ error: 'الرقم مسجل بالفعل. استخدم تسجيل الدخول.' });
  }
  const previous = pendingCustomerOtps.get(phone);
  if (previous && Date.now() - previous.createdAt < OTP_COOLDOWN_MS) {
    return res.status(429).json({ error: 'انتظر دقيقة قبل طلب رمز جديد.' });
  }
  const otp = String(crypto.randomInt(100000, 1000000));
  try {
    await sendWhatsAppOtp(phone, otp);
    pendingCustomerOtps.set(phone, { name, phone, passwordHash: hashPassword(password), otpHash: crypto.createHash('sha256').update(otp).digest('hex'), createdAt: Date.now(), expiresAt: Date.now() + OTP_TTL_MS });
    otpAttempts.set(phone, 0);
    return res.json({ success: true, message: 'تم إرسال رمز التأكيد إلى واتساب. الرمز صالح لمدة 5 دقائق.' });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'تعذر إرسال رمز التأكيد.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const phone = normalizeEgyptPhone(req.body?.phone);
  const otp = String(req.body?.otp || '').trim();
  if (!phone || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'أدخل رقم الهاتف ورمز التأكيد المكوّن من 6 أرقام.' });
  const pending = pendingCustomerOtps.get(phone);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingCustomerOtps.delete(phone);
    return res.status(400).json({ error: 'انتهت صلاحية الرمز أو لم تطلب رمزًا. اطلب رمزًا جديدًا.' });
  }
  const attempts = (otpAttempts.get(phone) || 0) + 1;
  otpAttempts.set(phone, attempts);
  if (attempts > 5) {
    pendingCustomerOtps.delete(phone);
    return res.status(429).json({ error: 'محاولات كثيرة. اطلب رمز تأكيد جديد.' });
  }
  const submittedHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (submittedHash !== pending.otpHash) return res.status(400).json({ error: 'رمز التأكيد غير صحيح.' });

  const db = readDB();
  const existing = db.customers[phone] || {};
  const customer = {
    ...existing, name: pending.name, phone, passwordHash: pending.passwordHash,
    whatsappVerified: true, ordersCount: Number(existing.ordersCount || 0),
    totalSpent: Number(existing.totalSpent || 0), tier: existing.tier || 'عميل جديد 🥉',
    createdAt: existing.createdAt || new Date().toISOString(), verifiedAt: new Date().toISOString()
  };
  db.customers[phone] = customer;
  writeDB(db);
  pendingCustomerOtps.delete(phone);
  otpAttempts.delete(phone);
  const { passwordHash, ...safeCustomer } = customer;
  return res.json({ success: true, customer: safeCustomer, message: 'تم تأكيد واتساب وإنشاء الحساب بنجاح.' });
});

const pendingPasswordResets = new Map();
app.post('/api/auth/request-password-reset', async (req, res) => {
  const phone = normalizeEgyptPhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'أدخل رقم واتساب مصري صحيح.' });
  const db = readDB();
  if (!db.customers[phone]?.passwordHash) return res.status(404).json({ error: 'لا يوجد حساب مسجل بهذا الرقم.' });
  const otp = String(crypto.randomInt(100000, 1000000));
  try {
    await sendWhatsAppOtp(phone, otp);
    pendingPasswordResets.set(phone, { otpHash: crypto.createHash('sha256').update(otp).digest('hex'), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    return res.json({ success: true, message: 'تم إرسال رمز التحقق إلى واتساب، صالح لمدة 5 دقائق.' });
  } catch (err) { return res.status(err.status || 500).json({ error: err.message || 'تعذر إرسال رمز التحقق.' }); }
});
app.post('/api/auth/reset-password', (req, res) => {
  const phone = normalizeEgyptPhone(req.body?.phone);
  const otp = String(req.body?.otp || '').trim();
  const password = String(req.body?.password || '');
  const pending = phone && pendingPasswordResets.get(phone);
  if (!phone || !/^\d{6}$/.test(otp) || password.length < 8) return res.status(400).json({ error: 'تحقق من الرقم والرمز، واجعل كلمة المرور 8 أحرف على الأقل.' });
  if (!pending || Date.now() > pending.expiresAt) { pendingPasswordResets.delete(phone); return res.status(400).json({ error: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.' }); }
  pending.attempts++;
  if (pending.attempts > 5) { pendingPasswordResets.delete(phone); return res.status(429).json({ error: 'محاولات كثيرة. اطلب رمزاً جديداً.' }); }
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  if (hash !== pending.otpHash) return res.status(400).json({ error: 'رمز التحقق غير صحيح.' });
  const db = readDB();
  if (!db.customers[phone]) return res.status(404).json({ error: 'الحساب غير موجود.' });
  db.customers[phone].passwordHash = hashPassword(password);
  writeDB(db); pendingPasswordResets.delete(phone);
  return res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
});

app.post('/api/auth/login', (req, res) => {
  const phone = normalizeEgyptPhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!phone || !password) return res.status(400).json({ error: 'أدخل رقم واتساب وكلمة المرور.' });
  const db = readDB();
  const customer = db.customers[phone];
  if (!customer || !customer.passwordHash || !verifyPassword(password, customer.passwordHash)) {
    return res.status(401).json({ error: 'رقم واتساب أو كلمة المرور غير صحيحة.' });
  }
  const { passwordHash, ...safeCustomer } = customer;
  return res.json({ success: true, customer: safeCustomer });
});

// Get Customer Profile & Order History
app.get('/api/customer/:phone', (req, res) => {
  const db = readDB();
  const phone = req.params.phone.trim();
  const customer = db.customers[phone];
  if (!customer) {
    return res.status(404).json({ error: "العميل غير مسجل" });
  }

  const customerOrders = db.orders.filter(
    o => o.customerPhone === phone || o.whatsappPhone === phone || o.activationPhone === phone
  );

  const { passwordHash, ...safeCustomer } = customer;
  res.json({ customer: safeCustomer, orders: customerOrders });
});

// 3. Create New Order
app.post('/api/orders', (req, res) => {
  const {
    customerName,
    customerPhone,
    whatsappPhone,
    activationPhone,
    network,
    packageId,
    packageName,
    price,
    paymentMethod,
    isCustomPrice
  } = req.body;

  if (!customerName || !activationPhone || !network || !packageName) {
    return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
  }

  const db = readDB();

  // Generate unique order ID: WN-000XXX
  const orderNumber = 101 + db.orders.length;
  const orderId = `WN-${String(orderNumber).padStart(6, '0')}`;

  const newOrder = {
    id: orderId,
    customerName: customerName.trim(),
    customerPhone: (customerPhone || activationPhone).trim(),
    whatsappPhone: (whatsappPhone || activationPhone).trim(),
    activationPhone: activationPhone.trim(),
    network: network.toUpperCase(),
    packageId: packageId || "custom",
    packageName: packageName,
    price: Number(price) || 0,
    isCustomPrice: !!isCustomPrice,
    paymentMethod: paymentMethod || "InstaPay",
    paymentProof: null,
    paymentStatus: isCustomPrice ? "في انتظار تحديد السعر" : "في انتظار الدفع",
    orderStatus: "طلبات يتم مراجعتها -تم حجزها", // Status 1: حجز
    assignedStaff: "فريق المراجعة",
    supplierName: "",
    notes: isCustomPrice ? "طلب استفسار عن سعر فودافون فليكس" : "تم إنشاء الطلب",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);

  // Update customer loyalty count & spending
  const cleanPhone = newOrder.customerPhone;
  if (!db.customers[cleanPhone]) {
    db.customers[cleanPhone] = {
      name: newOrder.customerName,
      phone: cleanPhone,
      ordersCount: 1,
      totalSpent: newOrder.price,
      tier: "عميل برونزي 🥉",
      lastOrderDate: new Date().toISOString()
    };
  } else {
    db.customers[cleanPhone].ordersCount += 1;
    db.customers[cleanPhone].totalSpent += newOrder.price;
    db.customers[cleanPhone].lastOrderDate = new Date().toISOString();
    // Update tier
    const count = db.customers[cleanPhone].ordersCount;
    if (count >= 5) db.customers[cleanPhone].tier = "عميل ماسي 💎 (أكبر خصم)";
    else if (count >= 3) db.customers[cleanPhone].tier = "عميل ذهبي ⭐";
    else if (count >= 2) db.customers[cleanPhone].tier = "عميل فضي 🥈";
  }

  writeDB(db);

  res.json({
    success: true,
    order: newOrder,
    message: "تم إنشاء طلبك بنجاح. رقم الطلب: " + orderId
  });
});

// 4. Upload Payment Proof Screenshot (upload does NOT approve payment)
app.post('/api/orders/:id/payment-proof', upload.single('screenshot'), (req, res) => {
  const orderId = req.params.id;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, error: "الطلب غير موجود" });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, error: "من فضلك اختر صورة إيصال الدفع أولاً." });
  }

  order.paymentProof = `/api/uploads/${req.file.filename}`;
  order.paymentStatus = "في انتظار مراجعة الدفع";
  order.orderStatus = "طلبات يتم مراجعتها -تم حجزها";
  order.updatedAt = new Date().toISOString();
  order.notes = (order.notes ? order.notes + " | " : "") +
    "تم رفع إثبات الدفع، وفي انتظار مراجعة الإدارة.";

  writeDB(db);
  res.json({
    success: true,
    order,
    message: "تم رفع إثبات الدفع. الطلب في انتظار مراجعة الإدارة ولا يعني الرفع تأكيد الدفع."
  });
});

// 5. Track Order by ID or Phone
app.get('/api/orders/track/:query', (req, res) => {
  const query = req.params.query.trim();
  const db = readDB();

  // Search by Order ID first
  let order = db.orders.find(o => o.id.toLowerCase() === query.toLowerCase());

  if (!order) {
    // Search latest order by phone
    order = db.orders.find(o => o.activationPhone === query || o.customerPhone === query || o.whatsappPhone === query);
  }

  if (!order) {
    return res.status(404).json({ error: "لم يتم العثور على طلب بهذا الرقم أو الهاتف" });
  }

  res.json({ success: true, order });
});

// 6. Admin: Get Orders with Analytics & Filter
app.get('/api/admin/orders', (req, res) => {
  const db = readDB();
  const { status, network, search } = req.query;

  let filtered = [...db.orders];

  if (status && status !== 'ALL') {
    filtered = filtered.filter(o => o.orderStatus === status);
  }
  if (network && network !== 'ALL') {
    filtered = filtered.filter(o => o.network === network);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.id.toLowerCase().includes(s) ||
      o.customerName.toLowerCase().includes(s) ||
      o.activationPhone.includes(s) ||
      o.whatsappPhone.includes(s)
    );
  }

  // Analytics Computation
  const totalOrders = db.orders.length;
  const networkCounts = {
    WE: db.orders.filter(o => o.network === 'WE').length,
    ETISALAT: db.orders.filter(o => o.network === 'ETISALAT').length,
    ORANGE: db.orders.filter(o => o.network === 'ORANGE').length,
    VODAFONE: db.orders.filter(o => o.network === 'VODAFONE').length
  };

  // Detailed packages count
  const packageCounts = {};
  db.orders.forEach(o => {
    const key = `${o.network}: ${o.packageName}`;
    packageCounts[key] = (packageCounts[key] || 0) + 1;
  });

  // Status breakdown
  const statusCounts = {
    pendingReview: db.orders.filter(o => o.orderStatus.includes("يتم مراجعتها") || o.orderStatus.includes("حجز")).length,
    awaitingActivation: db.orders.filter(o => o.orderStatus.includes("في انتظار التفعيل") || o.orderStatus.includes("تمت مراجعتها")).length,
    activated: db.orders.filter(o => o.orderStatus.includes("تم تفعيلها") || o.orderStatus.includes("تم التفعيل")).length,
    issue: db.orders.filter(o => o.orderStatus.includes("مشكلة") || o.orderStatus.includes("لم يتم")).length,
    refunded: db.orders.filter(o => o.orderStatus.includes("استرداد") || o.orderStatus.includes("معلق")).length
  };

  // Financial Metrics
  const validPaidOrders = db.orders.filter(o => o.paymentStatus === 'تم الدفع');
  const totalRevenue = validPaidOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const refundedOrders = db.orders.filter(o => o.orderStatus.includes("استرداد"));
  const totalRefunds = refundedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  // Profit estimation: e.g. 15-20% margin on retail
  const profitMargin = db.settings.supplierCommissionRate || 0.15;
  const netProfitTotal = Math.round(totalRevenue * profitMargin);

  // Daily & Monthly revenue
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);

  const dailyRevenue = validPaidOrders
    .filter(o => (o.createdAt || '').slice(0, 10) === todayStr)
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const dailyProfit = Math.round(dailyRevenue * profitMargin);

  const monthlyRevenue = validPaidOrders
    .filter(o => (o.createdAt || '').slice(0, 7) === currentMonthStr)
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const monthlyProfit = Math.round(monthlyRevenue * profitMargin);

  res.json({
    orders: filtered,
    stats: {
      totalOrders,
      networkCounts,
      packageCounts,
      statusCounts,
      financials: {
        totalRevenue,
        netProfitTotal,
        dailyRevenue,
        dailyProfit,
        monthlyRevenue,
        monthlyProfit,
        totalRefunds,
        dailyRefunds: 0,
        monthlyRefunds: totalRefunds
      }
    }
  });
});

// Admin: Reset orders/bookings only. Keep customers, settings, packages, and other data intact.
app.post('/api/admin/orders/reset', (req, res) => {
  try {
    const db = readDB();
    const deletedCount = Array.isArray(db.orders) ? db.orders.length : 0;
    db.orders = [];
    writeDB(db);
    return res.json({ success: true, deletedCount, message: 'تم تصفير الطلبات فقط. حسابات العملاء والإعدادات والباقات لم تتغير.' });
  } catch (err) {
    console.error('Failed to reset orders:', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء تصفير الطلبات.' });
  }
});

// 7. Admin: Update Order Status & Notes
app.patch('/api/admin/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status, paymentStatus, notes, assignedStaff, supplierName } = req.body;

  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  const nextStatus = String(status || '');
  if (nextStatus) order.orderStatus = nextStatus;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (notes !== undefined) order.notes = notes;
  if (assignedStaff) order.assignedStaff = assignedStaff;
  if (supplierName) order.supplierName = supplierName;
  order.updatedAt = new Date().toISOString();

  writeDB(db);

  // Generate simulated WhatsApp message notification payload
  let notificationMessage = "";
  if (nextStatus.includes("في انتظار التفعيل")) {
    notificationMessage = `مرحباً ${order.customerName}، تم تأكيد استلام دفعتك للطلب ${order.id}. باقتك (${order.packageName}) على شبكة ${order.network} أُرسلت الآن للمورد وجاري تفعيلها على خطك ${order.activationPhone} 🚀`;
  } else if (nextStatus.includes("تم تفعيلها") || nextStatus.includes("تم التفعيل")) {
    notificationMessage = `🎉 ألف مبروك يا ${order.customerName}! تم تفعيل باقتك (${order.packageName}) بنجاح على خطك ${order.activationPhone}. شكراً لثقتك في ميجامان، مستنيينك في التجديد القادم بعروض حصرية! ⭐`;
  } else if (nextStatus.includes("مشكلة")) {
    notificationMessage = `عزيزي ${order.customerName}، واجهتنا مشكلة بسيطة في تفعيل الطلب ${order.id} على الرقم ${order.activationPhone}. برجاء مراسلتنا فوراً لحلها أو استرداد المبلغ بالكامل 🤝`;
  }

  res.json({
    success: true,
    order,
    notificationMessage,
    message: "تم تحديث حالة الطلب بنجاح"
  });
});

// 8. Supplier: Get Orders ready for activation
app.get('/api/supplier/orders', (req, res) => {
  const db = readDB();
  // The supplier only sees orders that are verified/paid and ready for activation
  const supplierOrders = db.orders.filter(o =>
    o.orderStatus === "طلبات تمت مراجعتها-في انتظار التفعيل" ||
    o.orderStatus === "قيد التفعيل" ||
    o.orderStatus === "تمت مراجعتها-في انتظار التفعيل"
  );

  const completedOrders = db.orders.filter(o => o.orderStatus === "تم تفعيلها");

  res.json({
    activeOrders: supplierOrders,
    completedToday: completedOrders.length
  });
});

// 9. Supplier: Update activation status
app.patch('/api/supplier/orders/:id/activate', (req, res) => {
  const orderId = req.params.id;
  const { status, note } = req.body; // status: "تم تفعيلها" or "يوجد مشكلة"

  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  if (status === 'ACTIVATED') {
    order.orderStatus = "تم تفعيلها";
    order.notes = (order.notes ? order.notes + " | " : "") + "تم التفعيل من طرف المورد " + (note || "");
  } else if (status === 'ISSUE') {
    order.orderStatus = "طلبات لم يتم تفعيلها-يوجد مشكله";
    order.notes = (order.notes ? order.notes + " | " : "") + "تقرير المورد: مشكلة بالخط " + (note || "");
  }
  order.updatedAt = new Date().toISOString();

  writeDB(db);

  res.json({
    success: true,
    order,
    message: "تم تحديث حالة التفعيل بنجاح وإشعار العميل"
  });
});

// 10. AI Reconciliation Simulator (Google Messages / InstaPay OCR Matcher)
app.post('/api/admin/reconcile-ai', (req, res) => {
  const { smsText, targetOrderId } = req.body;
  const db = readDB();

  // Smart regex extraction from typical Egyptian bank / wallet / InstaPay SMS
  // e.g.: "تم استلام مبلغ 340.00 جم من محمد متولي / 01012345678 مرجع 998822"
  const amountMatch = smsText.match(/(\d+(?:\.\d{1,2})?)\s*(?:جم|جنيه|EGP|LE)/i) || smsText.match(/(?:مبلغ|قيمة|بمبلغ)\s*(\d+(?:\.\d{1,2})?)/i);
  const phoneMatch = smsText.match(/01[0125]\d{8}/);
  const refMatch = smsText.match(/(?:مرجع|Ref|رقم العملية|كود)\s*[:#]?\s*([A-Za-z0-9]+)/i);

  const extractedAmount = amountMatch ? parseFloat(amountMatch[1]) : null;
  const extractedPhone = phoneMatch ? phoneMatch[0] : null;
  const refCode = refMatch ? refMatch[1] : null;

  let matchedOrder = null;
  let confidence = "0%";
  let matchReason = "";

  if (targetOrderId) {
    matchedOrder = db.orders.find(o => o.id === targetOrderId);
  } else if (extractedPhone) {
    matchedOrder = db.orders.find(o =>
      (o.customerPhone === extractedPhone || o.activationPhone === extractedPhone || o.whatsappPhone === extractedPhone) &&
      o.paymentStatus !== "تم الدفع"
    );
  }

  if (matchedOrder) {
    if (extractedAmount && matchedOrder.price === extractedAmount) {
      confidence = "98%";
      matchReason = `تطابق تام في المبلغ (${extractedAmount} ج.م) ورقم هاتف العميل (${matchedOrder.customerPhone})`;
      // Matching is advisory only. Payment must be reviewed and approved by an administrator.
      matchReason += " — مطابقة مبدئية فقط؛ يلزم اعتماد الدفع يدويًا من لوحة الإدارة.";
    } else if (extractedAmount) {
      confidence = "65%";
      matchReason = `رقم الهاتف متطابق ولكن المبلغ المستلم (${extractedAmount}) مختلف عن سعر الباقة (${matchedOrder.price})`;
    }
  } else {
    matchReason = "لم يتم العثور على طلب معلق يتطابق مباشرة مع بيانات الرسالة";
  }

  const result = {
    extractedAmount,
    extractedPhone,
    refCode,
    confidence,
    matchReason,
    matchedOrder
  };

  res.json({ success: true, reconciliation: result });
});

// 11. Excel export: one sheet per network plus a final sheet with all orders.
app.get('/api/export/excel', requireAdmin, (req, res) => {
  const db = readDB();
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const networkSheets = [
    { key: 'WE', name: 'WE' },
    { key: 'VODAFONE', name: 'فودافون' },
    { key: 'ORANGE', name: 'أورنج' },
    { key: 'ETISALAT', name: 'اتصالات' }
  ];
  const headers = ['رقم الطلب', 'اسم العميل', 'رقم التفعيل', 'رقم الواتساب', 'الشركة', 'اسم الباقة', 'السعر', 'طريقة الدفع', 'حالة الدفع', 'حالة الطلب', 'تاريخ الطلب', 'ملاحظات'];
  const rowFor = (o) => ({
    'رقم الطلب': o.id || '',
    'اسم العميل': o.customerName || '',
    'رقم التفعيل': o.activationPhone || '',
    'رقم الواتساب': o.whatsappPhone || o.customerPhone || '',
    'الشركة': ({ WE: 'WE', VODAFONE: 'فودافون', ORANGE: 'أورنج', ETISALAT: 'اتصالات' })[String(o.network || '').toUpperCase()] || o.network || '',
    'اسم الباقة': o.packageName || '',
    'السعر': Number(o.price || 0),
    'طريقة الدفع': o.paymentMethod || '',
    'حالة الدفع': o.paymentStatus || '',
    'حالة الطلب': o.orderStatus || '',
    'تاريخ الطلب': o.createdAt ? String(o.createdAt).slice(0, 19).replace('T', ' ') : '',
    'ملاحظات': o.notes || ''
  });
  const workbook = XLSX.utils.book_new();
  for (const network of networkSheets) {
    const filtered = orders.filter(o => String(o.network || '').toUpperCase() === network.key).map(rowFor);
    const sheet = XLSX.utils.json_to_sheet(filtered, { header: headers });
    sheet['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, sheet, network.name);
  }
  const allSheet = XLSX.utils.json_to_sheet(orders.map(rowFor), { header: headers });
  allSheet['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, allSheet, 'كل الطلبات');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="megaman-orders-${Date.now()}.xlsx"`);
  res.send(buffer);
});

// CSV compatibility export (all orders in one file)
app.get('/api/export/csv', requireAdmin, (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  let csvContent = '\uFEFF';
  csvContent += 'رقم الطلب,اسم العميل,رقم التفعيل,رقم الواتساب,الشبكة,الباقة,السعر,حالة الدفع,حالة الطلب,تاريخ الطلب,ملاحظات\n';
  orders.forEach(o => {
    csvContent += [o.id, o.customerName, o.activationPhone, o.whatsappPhone, o.network, o.packageName, o.price, o.paymentStatus, o.orderStatus, o.createdAt ? String(o.createdAt).slice(0, 19).replace('T', ' ') : '', o.notes].map(escape).join(',') + '\n';
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="megaman-orders-' + Date.now() + '.csv"');
  res.send(csvContent);
});

module.exports = app;
