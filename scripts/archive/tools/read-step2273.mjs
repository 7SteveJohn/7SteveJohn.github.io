import fs from 'fs';
import readline from 'readline';

async function readResponse() {
  const filePath = 'C:/Users/SevenJohn/.gemini/antigravity/brain/7ade5c98-86e3-4a6c-8356-405556e2978f/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  
  for await (const line of rl) {
    if (line.includes('"step_index":2273') || line.includes('"step_index": 2273')) {
      const obj = JSON.parse(line);
      console.log('CONTENT:', obj.content);
    }
  }
}

readResponse();
