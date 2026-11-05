import fs from 'fs';
import readline from 'readline';

async function readRecentInputs() {
  const filePath = 'C:/Users/SevenJohn/.gemini/antigravity/brain/7ade5c98-86e3-4a6c-8356-405556e2978f/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  
  const entries = [];
  for await (const line of rl) {
    if (line.includes('USER_INPUT') || line.includes('PLANNER_RESPONSE')) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') {
          entries.push({ step: obj.step_index, type: obj.type, content: obj.content });
        }
      } catch (e) {}
    }
  }
  console.log(JSON.stringify(entries.slice(-5), null, 2));
}

readRecentInputs();
