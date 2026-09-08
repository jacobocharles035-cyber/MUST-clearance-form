const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Kuagiza Models
const User = require('./models/user');
const Clearance = require('./models/Clearance');

const app = express();

// 1. CORS CONFIGURATION (Inaruhusu Netlify kuwasiliana na Render)
const allowedOrigins = [
  'https://jina-lako.netlify.app', // BADILISHA HAPA: Weka URL yako halisi ya Netlify
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Inaruhusu maombi yote kwa sasa kuzuia blockage
    }
  },
  credentials: true
}));

app.use(express.json());

// 2. KUUNGANISHA NA DATABASE YA MONGODB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jacobocharles035_db_user:jacobo%401234@cluster0.x10rcum.mongodb.net/must_clearance_db?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Database ya MongoDB imeunganishwa kikamilifu!'))
  .catch((err) => console.error('❌ Tatizo la kuunganisha Database:', err));

// ==========================================================================
// 3. API ROUTES (ZOTE ZINA PREFIX YA /api)
// ==========================================================================

// ROOT ROUTE
app.get('/', (req, res) => {
  res.send('🚀 MUST Clearance API inafanya kazi kikamilifu!');
});

// A. API YA LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Tafadhali ingiza username na password.' });
  }

  try {
    let user = await User.findOne({ username, role });

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

// B. API YA KUTUMA OMBI LA CLEARANCE
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

// C. API YA KUPATA TAARIFA ZA STUDENT DASHBOARD
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

// D. API YA STAFF APPROVE/REJECT
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

// E. API YA ADMIN OVERVIEW
app.get('/api/clearance/admin/all', async (req, res) => {
  try {
    const allStudents = await Clearance.find();
    res.json(allStudents);
  } catch (err) {
    res.status(500).json({ message: 'Itilafu ya server', error: err.message });
  }
});

// 4. ANZA SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server inaendeshwa kwenye Port: ${PORT}`);
});