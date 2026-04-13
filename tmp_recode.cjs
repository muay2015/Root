const fs = require('fs');
const files = ['core.ts', 'korean.ts', 'science.ts', 'social.ts'];
for (const f of files) {
  const path = 'src/lib/question/prompts/' + f;
  let content = fs.readFileSync(path, 'utf16le');
  if(!content.includes('import')) {
    // maybe it wasn't utf16le completely
    content = fs.readFileSync(path, 'utf8').replace(/\0/g, '');
  }
  fs.writeFileSync(path, content, 'utf8');
}
