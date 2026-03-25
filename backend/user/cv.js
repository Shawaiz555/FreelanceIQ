/**
 * POST /api/user/cv
 *
 * Accepts a multipart/form-data upload with a single file field named "cv".
 * Supports PDF and DOCX (Word) files up to 5 MB.
 *
 * Parses the raw text from the file using:
 *   - pdf-parse  for .pdf
 *   - mammoth    for .docx / .doc
 *
 * Stores the extracted plain-text in user.profile.cv_text (max 20,000 chars).
 * The file itself is NOT stored — only the parsed text is kept in MongoDB.
 *
 * Required packages (run in backend/):
 *   npm install multer pdf-parse mammoth
 */

const multer = require('multer');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

// ── Multer: in-memory storage (no disk writes) ────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new AppError('Only PDF and DOCX files are supported', 400));
  },
}).single('cv');

// Promisified multer middleware
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) reject(err instanceof multer.MulterError
        ? new AppError(`Upload error: ${err.message}`, 400)
        : err);
      else resolve();
    });
  });
}

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractText(file) {
  const isPdf = file.mimetype === 'application/pdf';

  if (isPdf) {
    // pdf-parse v2 API: new PDFParse({ data: buffer }).getText()
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    return result.text || '';
  }

  // DOCX / DOC via mammoth
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return result.value || '';
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function handler(req, res) {
  if (req.method === 'DELETE') {
    await connectDB();
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'profile.cv_text': '',
        'profile.cv_filename': '',
        'profile.cv_uploaded_at': null,
      },
    });
    return res.status(200).json({ success: true, message: 'CV removed' });
  }

  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  await runMulter(req, res);

  if (!req.file) throw new AppError('No file uploaded', 400);

  let rawText;
  try {
    rawText = await extractText(req.file);
  } catch (err) {
    throw new AppError(`Failed to parse file: ${err.message}`, 422);
  }

  // Trim to 20,000 chars — plenty for a CV, keeps the MongoDB document small
  const cv_text = rawText.replace(/\s+/g, ' ').trim().slice(0, 20000);

  if (cv_text.length < 50) {
    throw new AppError('Could not extract readable text from the uploaded file. Make sure it is a text-based PDF (not a scanned image).', 422);
  }

  await connectDB();
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      'profile.cv_text': cv_text,
      'profile.cv_filename': req.file.originalname,
      'profile.cv_uploaded_at': new Date(),
    },
  });

  // Extract structured profile fields from CV text via OpenAI
  let extracted = {};
  try {
    const { extractProfileFromCV } = require('../lib/services/openai.service');
    const { data } = await extractProfileFromCV(cv_text);
    extracted = data;

    // Build a $set map — only overwrite fields that are non-empty in the extraction
    const profileUpdates = {};
    if (extracted.name)                    profileUpdates['name']                         = extracted.name;
    if (extracted.title)                   profileUpdates['profile.title']                = extracted.title;
    if (extracted.bio)                     profileUpdates['profile.bio']                  = extracted.bio;
    if (extracted.skills?.length)          profileUpdates['profile.skills']               = extracted.skills;
    if (extracted.experience_years)        profileUpdates['profile.experience_years']     = extracted.experience_years;
    if (extracted.location)                profileUpdates['profile.location']             = extracted.location;
    if (extracted.linkedin_url)            profileUpdates['profile.linkedin_url']         = extracted.linkedin_url;
    if (extracted.github_url)              profileUpdates['profile.github_url']           = extracted.github_url;
    if (extracted.website_url)             profileUpdates['profile.website_url']          = extracted.website_url;
    if (extracted.languages?.length)       profileUpdates['profile.languages']            = extracted.languages;
    if (extracted.education?.length)       profileUpdates['profile.education']            = extracted.education;
    if (extracted.certifications?.length)  profileUpdates['profile.certifications']       = extracted.certifications;

    if (Object.keys(profileUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, { $set: profileUpdates });
    }
  } catch (extractErr) {
    // Non-fatal: log but don't fail the upload
    console.error('[CV] Profile extraction failed:', extractErr.message);
  }

  return res.status(200).json({
    success: true,
    message: 'CV uploaded and parsed',
    data: {
      filename: req.file.originalname,
      chars_extracted: cv_text.length,
      extracted,
    },
  });
}

module.exports = withErrorHandler(withAuth(handler));
