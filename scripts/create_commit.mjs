import fs from 'fs';

const ps1Content = `
$ErrorActionPreference = 'Stop'
git add -A
git commit -F scripts/commit_msg.txt
git push origin main
Remove-Item -Force scripts/commit_msg.txt -ErrorAction SilentlyContinue
`;

const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
const buf = Buffer.concat([bom, Buffer.from(ps1Content, 'utf8')]);
fs.writeFileSync('scripts/do_commit.ps1', buf);
