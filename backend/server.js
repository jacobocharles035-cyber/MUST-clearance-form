const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

// Kuagiza Models tulizotengeneza
const User = require('./models/user');
const Clearance = require('./models/Clearance');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Kuhudumia frontend static files (Kama folda yako ya frontend ipo nje ya backend)
app.use(express.static(path.join(__dirname, '../')));

// 1. KUUNGANISHA NA DATABASE YA MONGODB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jacobocharles035_db_user:jacobo%401234@cluster0.x10rcum.mongodb.net/must_clearance_db?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Database ya MongoDB imeunganishwa kikamilifu!'))
  .catch((err) => console.error('❌ Tatizo la kuunganisha Database:', err));

// ==========================================================================
// 2. API ROUTES
// ==========================================================================

// ROOT ROUTE (Inazuia kosa la 'Cannot GET /')
app.get('/', (req, res) => {
  res.send('🚀 MUST Clearance API inafanya kazi kikamilifu!');
});

// A. API YA LOGIN (Inahudumia index.html)
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    let user = await User.findOne({ username, role });

    // Kwa ajili ya Testing: Kama mtumiaji hayupo, anatengenezwa auto mara ya kwanza
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({ username, password: hashedPassword, role });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Neno la siri (password) si sahihi.' });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'SECRET_KEY',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login imefanikiwa!',
      token,
      username: user.username,
      role: user.role
    });

  } catch (err) {
    res.status(500).json({ message: 'Itilafu ya server', error: err.message });
  }
});

// B. API YA KUTUMA OMBI LA CLEARANCE (Inahudumia student-request.html)
app.post('/api/clearance/request', async (req, res) => {
  const { studentName, studentRegNo, academicProgram, academicYear } = req.body;

  try {
    const defaultDepartments = [
      { name: "Head of Department (HOD)", remarks: "Nyaraka za masomo zipo sawa." },
      { name: "Library (Maktaba)", remarks: "Inasubiri uhakiki wa vitabu." },
      { name: "Bursar / Finance", remarks: "Inasubiri Uhakiki wa Resiti." },
      { name: "Hostel & Accommodation", remarks: "Inasubiri uhakiki wa chumba." },
      { name: "Sports & Games", remarks: "Haijaanza." },
      { name: "Dean of Students", remarks: "Inasubiri idara zingine." }
    ];

    let record = await Clearance.findOne({ studentRegNo });

    if (record) {
      record.studentName = studentName;
      record.academicProgram = academicProgram;
      record.academicYear = academicYear;
      await record.save();
    } else {
      record = await Clearance.create({
        studentName,
        studentRegNo,
        academicProgram,
        academicYear,
        departments: defaultDepartments
      });
    }

    res.json({ message: 'Maombi yako yamewasilishwa kikamilifu!', data: record });
  } catch (err) {
    res.status(500).json({ message: 'Imeshindwa kuwasilisha maombi', error: err.message });
  }
});

// C. API YA KUPATA TAARIFA ZA STUDENT DASHBOARD (Inahudumia student-dashboard.html)
app.get('/api/clearance/student/:regNo', async (req, res) => {
  try {
    const clearance = await Clearance.findOne({ studentRegNo: req.params.regNo });
    if (!clearance) {
      return res.status(404).json({ message: 'Hujatuma maombi ya clearance bado.' });
    }
    res.json(clearance);
  } catch (err) {
    res.status(500).json({ message: 'Itilafu ya server', error: err.message });
  }
});

// D. API YA STAFF APPROVE/REJECT (Inahudumia staff-dashboard.html)
app.put('/api/clearance/staff/action', async (req, res) => {
  const { studentRegNo, departmentName, status, remarks } = req.body;

  try {
    const record = await Clearance.findOne({ studentRegNo });
    if (!record) {
      return res.status(404).json({ message: 'Mwanafunzi hajapatikana.' });
    }

    const dept = record.departments.find(d => d.name === departmentName);
    if (dept) {
      dept.status = status;
      if (remarks) dept.remarks = remarks;
    }

    // Sasisha Overall Status kama idara zote zime-approve
    const allApproved = record.departments.every(d => d.status === 'approved');
    if (allApproved) {
      record.overallStatus = 'Cleared';
    } else if (status === 'rejected') {
      record.overallStatus = 'Has Issues';
    }

    await record.save();
    res.json({ message: 'Hali ya idara imebadilishwa kikamilifu!', record });
  } catch (err) {
    res.status(500).json({ message: 'Itilafu ya server', error: err.message });
  }
});

// E. API YA ADMIN OVERVIEW (Inahudumia admin-dashboard.html)
app.get('/api/clearance/admin/all', async (req, res) => {
  try {
    const allStudents = await Clearance.find();
    res.json(allStudents);
  } catch (err) {
    res.status(500).json({ message: 'Itilafu ya server', error: err.message });
  }
});

// 3. ANZA SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server inaendeshwa kwenye http://localhost:${PORT}`);
});