import fs from 'node:fs';
import path from 'node:path';

const aiFiles = [
  'ai-concepts-primer.md',
  'ai-model-training.md',
  'ai-agent-boundary.md',
  'ai-china-landscape.md',
  'ai-frontier-mirror.md',
  'ai-jobs-rethink.md',
  'ai-learning-paths.md'
];

for (const f of aiFiles) {
  const content = fs.readFileSync(path.join('d:/HTML/posts', f), 'utf8');
  const lines = content.split('\n');
  const summaryLine = lines.find(l => l.startsWith('summary:'));
  const firstP = lines.slice(11, 20).join(' ').trim();
  const lastP = lines.slice(-15).join(' ').trim();
  console.log(`\n=== ${f} ===`);
  console.log(`[Summary]: ${summaryLine}`);
  console.log(`[First lines]: ${firstP.slice(0, 150)}...`);
  console.log(`[Ending lines]: ${lastP.slice(-200)}...`);
}
