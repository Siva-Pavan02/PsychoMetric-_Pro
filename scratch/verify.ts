import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { db } from '../src/lib/db';
import { QUESTIONS } from '../src/data/questions';

async function run() {
  const responses = await db.response.findMany();
  console.log(`Total Responses: ${responses.length}`);

  // Test 5 questions: O1 (reverse: false), C1 (false), E1 (false), A1 (reverse: true), N1 (false)
  const qIds = ["O1", "C1", "E1", "A1", "O7"];
  
  for (const qid of qIds) {
    const q = QUESTIONS.find(x => x.id === qid);
    const answers = responses.filter(r => r.questionId === qid);
    const counts = [0, 0, 0, 0, 0];
    answers.forEach(a => {
      if (a.answer >= 1 && a.answer <= 5) counts[a.answer - 1]++;
    });
    console.log(`\nQuestion ${qid} (Reverse: ${q?.reverseScored})`);
    console.log(`1: ${counts[0]}`);
    console.log(`2: ${counts[1]}`);
    console.log(`3: ${counts[2]}`);
    console.log(`4: ${counts[3]}`);
    console.log(`5: ${counts[4]}`);
    console.log(`Total for ${qid}: ${answers.length}`);
  }
}

run().catch(console.error).finally(() => process.exit(0));
