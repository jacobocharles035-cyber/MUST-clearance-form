const mongoose = require('mongoose');

const ClearanceSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentRegNo: { type: String, required: true, unique: true },
  academicProgram: { type: String, required: true },
  academicYear: { type: String, required: true },
  overallStatus: { type: String, enum: ['In Progress', 'Cleared', 'Has Issues'], default: 'In Progress' },
  
  // Orodha ya Idara na Hali Zao
  departments: [
    {
      name: { type: String, required: true },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      remarks: { type: String, default: 'Haijaanza' }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Clearance', ClearanceSchema);