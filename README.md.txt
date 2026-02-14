const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const usersFile = path.join(__dirname, 'users.json');

function readUsers() {
  if (!fs.existsSync(usersFile)) return [];
  const data = fs.readFileSync(usersFile);
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const phone = req.body.phone;
  if (!phone) {
    return res.send('شماره وارد نشده است!');
  }

  const adminPhone = '09123456789';

  if (phone === adminPhone) {
    return res.redirect('/admin');
  }

  const users = readUsers();
  const user = users.find(u => u.phone === phone);

  if (!user) {
    return res.send('شماره شما ثبت نشده است.');
  }

  res.cookie('phone', phone);
  res.redirect('/user');
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/users', (req, res) => {
  const users = readUsers();
  res.json(users);
});

app.post('/api/users/add', (req, res) => {
  const { phone, shares, price } = req.body;
  let users = readUsers();

  if (users.find(u => u.phone === phone)) {
    return res.status(400).send('کاربر با این شماره قبلاً ثبت شده است.');
  }

  users.push({
    id: Date.now(),
    phone,
    approved: false,
    shares: Number(shares),
    price: Number(price),
    sold: false
  });

  saveUsers(users);
  res.sendStatus(200);
});

// API تایید کاربر
app.post('/api/users/approve', (req, res) => {
  const { id } = req.body;
  let users = readUsers();
  const user = users.find(u => u.id == id);
  if (!user) return res.status(404).send('کاربر یافت نشد.');

  user.approved = true;
  saveUsers(users);
  res.sendStatus(200);
});

app.post('/api/users/delete', (req, res) => {
  const { id } = req.body;
  let users = readUsers();
  users = users.filter(u => u.id != id);
  saveUsers(users);
  res.sendStatus(200);
});
app.post('/api/users/edit', (req, res) => {
  const { id, shares, price } = req.body;
  let users = readUsers();
  const user = users.find(u => u.id == id);
  if (!user) return res.status(404).send('کاربر یافت نشد.');

  user.shares = Number(shares);
  user.price = Number(price);
  saveUsers(users);
  res.sendStatus(200);
});

app.get('/admin/download', async (req, res) => {
  const users = readUsers();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Report');

  worksheet.columns = [
    { header: 'شماره', key: 'id', width: 10 },
    { header: 'شماره موبایل', key: 'phone', width: 20 },
    { header: 'وضعیت تأیید', key: 'approved', width: 15 },
    { header: 'تعداد سهام', key: 'shares', width: 15 },
    { header: 'قیمت هر سهم', key: 'price', width: 15 },
    { header: 'ارزش کل', key: 'value', width: 20 },
    { header: 'وضعیت فروش', key: 'sold', width: 15 }
  ];

  users.forEach(user => {
    worksheet.addRow({
      id: user.id,
      phone: user.phone,
      approved: user.approved ? 'تأیید شده' : 'در انتظار',
      shares: user.shares,
      price: user.price,
      value: user.shares * user.price,
      sold: user.sold ? 'فروخته شده' : 'ندارند'
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + 'stock_report.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
});

app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/api/user-info', (req, res) => {
  const phone = req.cookies ? req.cookies.phone : null;
  if (!phone) return res.status(401).send('لطفاً ابتدا وارد شوید.');

  const users = readUsers();
  const user = users.find(u => u.phone === phone);
  if (!user) return res.status(404).send('کاربر یافت نشد.');

  res.json(user);
});

app.post('/api/user/sell', (req, res) => {
  const phone = req.cookies ? req.cookies.phone : null;
  if (!phone) return res.status(401).send('لطفاً ابتدا وارد شوید.');

  let users = readUsers();
  const user = users.find(u => u.phone === phone);
  if (!user) return res.status(404).send('کاربر یافت نشد.');

  user.sold = true;
  saveUsers(users);
  res.sendStatus(200);
});

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

