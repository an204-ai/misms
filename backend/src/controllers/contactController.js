const { readDb, writeDb } = require('../db/database');

exports.getAllContacts = (req, res) => {
  const db = readDb();
  // Return sorted by latest first
  const sorted = [...(db.contacts || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({
    success: true,
    data: sorted
  });
};

exports.createContact = (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  if (!name || (!phone && !email)) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp họ tên và số điện thoại hoặc email liên hệ!'
    });
  }

  const db = readDb();
  const newContact = {
    id: 'ct_' + Date.now(),
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    email: email ? email.trim() : '',
    subject: subject ? subject.trim() : 'Yêu cầu tư vấn dịch vụ CloudSms',
    message: message ? message.trim() : 'Khách hàng yêu cầu liên hệ tư vấn.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    notes: ''
  };

  if (!db.contacts) db.contacts = [];
  db.contacts.unshift(newContact);
  writeDb(db);

  res.json({
    success: true,
    message: 'Yêu cầu liên hệ của bạn đã được gửi thành công! Tư vấn viên sẽ liên hệ lại sớm nhất.',
    data: newContact
  });
};

exports.updateContactStatus = (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const db = readDb();

  const contact = (db.contacts || []).find(c => c.id === id);
  if (!contact) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin liên hệ!' });
  }

  if (status) contact.status = status;
  if (typeof notes === 'string') contact.notes = notes;

  writeDb(db);
  res.json({
    success: true,
    message: 'Cập nhật trạng thái liên hệ thành công!',
    data: contact
  });
};

exports.deleteContact = (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const initialLength = (db.contacts || []).length;
  db.contacts = (db.contacts || []).filter(c => c.id !== id);

  if (db.contacts.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ cần xóa!' });
  }

  writeDb(db);
  res.json({
    success: true,
    message: 'Đã xóa liên hệ thành công!'
  });
};
