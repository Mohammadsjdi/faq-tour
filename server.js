const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser'); // برای خواندن کوکی‌ها
const ExcelJS = require('exceljs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const usersFile = path.join(__dirname, 'users.json');

// تابع خواندن داده‌ها از فایل JSON با هندل خطا
function readUsers() {
  try {
    if (!fs.existsSync(usersFile)) return [];
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('خطا در خواندن فایل users.json:', error);
    return null; // بازگشت null برای تشخیص خطا
  }
}

// تابع ذخیره داده‌ها در فایل JSON با هندل خطا
function saveUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('خطا در ذخیره فایل users.json:', error);
    return false;
  }
}

// صفحه ورود
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ورود و تشخیص نقش
app.post('/login', (req, res) => {
  try {
    const phone = req.body.phone;
    if (!phone) {
      return res.status(400).send('شماره وارد نشده است!');
    }

    const adminPhone = '7';

    if (phone === adminPhone) {
      return res.redirect('/admin');
    }

    const users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const user = users.find(u => u.phone === phone);

    if (!user) {
      return res.status(404).send('شماره شما ثبت نشده است.');
    }
    
    // ست کردن کوکی شماره تلفن برای شناسایی کاربر در پنل
    res.cookie('phone', phone, { httpOnly: true });
    res.redirect('/user');
  } catch (error) {
    console.error('خطا در فرایند لاگین:', error);
    res.status(500).send('خطای سرور در هنگام لاگین.');
  }
});

// صفحه پنل ادمین
app.get('/admin', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } catch (error) {
    console.error('خطا در بارگذاری صفحه ادمین:', error);
    res.status(500).send('خطا در بارگذاری صفحه ادمین.');
  }
});

// صفحه پنل کاربر (می‌توانید فایل user.html را ایجاد کنید)
app.get('/user', (req, res) => {
  try {
    if (!req.cookies.phone) {
      return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
  } catch (error) {
    console.error('خطا در بارگذاری صفحه کاربر:', error);
    res.status(500).send('خطا در بارگذاری صفحه کاربر.');
  }
});

// API دریافت لیست کاربران
app.get('/api/users', (req, res) => {
  try {
    const users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }
    res.json(users);
  } catch (error) {
    console.error('خطا در دریافت لیست کاربران:', error);
    res.status(500).send('خطا در دریافت لیست کاربران.');
  }
});

// API اضافه کردن کاربر جدید
app.post('/api/users/add', (req, res) => {
  try {
    const { phone, shares, price } = req.body;
    if (!phone || shares == null || price == null) {
      return res.status(400).send('اطلاعات ناقص ارسال شده است.');
    }

    let users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    if (users.find(u => u.phone === phone)) {
      return res.status(400).send('کاربر با این شماره قبلاً ثبت شده است.');
    }

    const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;

    const newUser = {
      id: newId,
      phone,
      shares: Number(shares),
      price: Number(price),
      approved: false,
      sold: false,
    };

    users.push(newUser);

    if (!saveUsers(users)) {
      return res.status(500).send('خطا در ذخیره کاربر جدید.');
    }

    res.status(200).send('کاربر جدید اضافه شد.');
  } catch (error) {
    console.error('خطا در اضافه کردن کاربر جدید:', error);
    res.status(500).send('خطای سرور در اضافه کردن کاربر جدید.');
  }
});

// API ویرایش کاربر
app.post('/api/users/edit', (req, res) => {
  try {
    const { id, phone, shares, price } = req.body;
    if (!id || !phone || shares == null || price == null) {
      return res.status(400).send('اطلاعات ناقص ارسال شده است.');
    }

    let users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const userIndex = users.findIndex(u => u.id == id);
    if (userIndex === -1) {
      return res.status(404).send('کاربر یافت نشد.');
    }

    if (users.some(u => u.phone === phone && u.id != id)) {
      return res.status(400).send('این شماره موبایل متعلق به کاربر دیگری است.');
    }

    users[userIndex].phone = phone;
    users[userIndex].shares = Number(shares);
    users[userIndex].price = Number(price);

    if (!saveUsers(users)) {
      return res.status(500).send('خطا در ذخیره تغییرات کاربر.');
    }

    res.status(200).send('ویرایش با موفقیت انجام شد.');
  } catch (error) {
    console.error('خطا در ویرایش کاربر:', error);
    res.status(500).send('خطای سرور در ویرایش کاربر.');
  }
});

// API حذف کاربر
app.post('/api/users/delete', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).send('آیدی کاربر ارسال نشده است.');
    }

    let users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const newUsers = users.filter(u => u.id != id);
    if (newUsers.length === users.length) {
      return res.status(404).send('کاربر یافت نشد.');
    }

    if (!saveUsers(newUsers)) {
      return res.status(500).send('خطا در حذف کاربر.');
    }

    res.status(200).send('کاربر حذف شد.');
  } catch (error) {
    console.error('خطا در حذف کاربر:', error);
    res.status(500).send('خطای سرور در حذف کاربر.');
  }
});
app.get('/api/user-info', (req, res) => {
  try {
    const phone = req.cookies.phone;
    if (!phone) {
      return res.status(401).send('کاربر وارد نشده است.');
    }

    const users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const user = users.find(u => u.phone === phone);
    if (!user) {
      return res.status(404).send('کاربر یافت نشد.');
    }

    res.json(user);
  } catch (error) {
    console.error('خطا در دریافت اطلاعات کاربر:', error);
    res.status(500).send('خطای سرور در دریافت اطلاعات کاربر.');
  }
});

// API گرفتن اطلاعات یک کاربر
app.get('/api/users/:id', (req, res) => {
  try {
    const id = req.params.id;
    const users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const user = users.find(u => u.id == id);
    if (!user) {
      return res.status(404).send('کاربر یافت نشد.');
    }
    res.json(user);
  } catch (error) {
    console.error('خطا در دریافت اطلاعات کاربر:', error);
    res.status(500).send('خطای سرور در دریافت اطلاعات کاربر.');
  }
});

// API تایید کاربر
app.post('/api/users/approve', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).send('آیدی کاربر ارسال نشده است.');
    }

    let users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const userIndex = users.findIndex(u => u.id == id);
    if (userIndex === -1) {
      return res.status(404).send('کاربر یافت نشد.');
    }

    users[userIndex].approved = true;

    if (!saveUsers(users)) {
      return res.status(500).send('خطا در ذخیره تغییر وضعیت کاربر.');
    }

    res.status(200).send('کاربر تأیید شد.');
  } catch (error) {
    console.error('خطا در تأیید کاربر:', error);
    res.status(500).send('خطای سرور در تأیید کاربر.');
  }
});

// API دانلود گزارش اکسل کاربران
app.get('/api/users/excel', async (req, res) => {
  try {
    const users = readUsers();
    if (users === null) {
      return res.status(500).send('خطا در خواندن داده‌های کاربران.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    worksheet.columns = [
      { header: 'شماره', key: 'id', width: 10 },
      { header: 'شماره موبایل', key: 'phone', width: 20 },
      { header: 'وضعیت تأیید', key: 'approved', width: 15 },
      { header: 'تعداد سهام', key: 'shares', width: 15 },
      { header: 'قیمت هر سهم', key: 'price', width: 15 },
      { header: 'ارزش کل', key: 'totalValue', width: 20 },
      { header: 'وضعیت فروش', key: 'sold', width: 15 },
    ];

    users.forEach(user => {
      worksheet.addRow({
        id: user.id,
        phone: user.phone,
        approved: user.approved ? 'تأیید شده' : 'در انتظار',
        shares: user.shares,
        price: user.price,
        totalValue: user.shares * user.price,
        sold: user.sold ? 'فروخته شده' : 'ندارند',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('خطا در ساخت گزارش اکسل:', error);
    res.status(500).send('خطا در ساخت گزارش اکسل.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
