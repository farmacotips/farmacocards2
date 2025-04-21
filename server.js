const express = require('express'), multer = require('multer'), csv = require('csv-parser'), fs = require('fs');
const app = express(), upload = multer({ dest: 'uploads/' });
let flashcards = [];
app.use(express.static('public'));
const path = require('path'); // Si no lo tienes ya
app.use(express.static('public'));
app.get('/mazos-publicos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mazos-publicos.json'));
});

app.post('/upload', upload.single('csv'), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim() }))
    .on('data', data => results.push({ question: data.pregunta, answer: data.respuesta }))
    .on('end', () => { flashcards = results; fs.unlinkSync(req.file.path); res.sendStatus(200); });
});
app.get('/cards', (req, res) => res.json(flashcards));
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
