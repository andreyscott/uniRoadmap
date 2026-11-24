/**
 * `npm run content:check`: validates everything in /content and prints a summary.
 * Run it after editing content; it's faster than the full test suite.
 */
import { ContentError, loadContent, loadQuiz, loadUniversities } from "../src/lib/content/load";

try {
  const { faculties, courses, skills } = loadContent();
  console.log(`✓ ${faculties.length} faculties`);
  for (const c of courses) {
    const nodes = c.roadmap?.nodes.length ?? 0;
    console.log(`✓ course  ${c.id.padEnd(28)} ${nodes ? `${nodes} nodes` : "no roadmap yet"}`);
  }
  for (const s of skills) {
    console.log(`✓ skill   ${s.id.padEnd(28)} ${s.roadmap.nodes.length} nodes`);
  }
  const quiz = loadQuiz();
  console.log(`✓ quiz    ${quiz.questions.length} questions`);
  console.log(`✓ starter universities: ${loadUniversities().length}`);
} catch (err) {
  if (err instanceof ContentError) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  throw err;
}
