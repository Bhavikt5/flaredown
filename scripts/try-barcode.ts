// Run: npx tsx scripts/try-barcode.ts 8901058000306 8901719134845
// Looks up barcodes on Open Food Facts and shows how the app scores them.

import { lookupBarcode } from '../src/lib/openFoodFacts';
import { scoreTags } from '../src/lib/score';
import { TAG_LABELS } from '../src/data/ingredients';

(async () => {
  for (const code of process.argv.slice(2)) {
    const r = await lookupBarcode(code);
    if (!r.found) {
      console.log(`\n${code}: not in Open Food Facts`);
      continue;
    }
    const p = r.product;
    const s = scoreTags(p.tags);
    console.log(`\n${code}: ${p.name}  (NOVA ${p.nova ?? '?'})`);
    for (const t of p.tags) console.log(`  ${TAG_LABELS[t].padEnd(24)} ${p.reasons[t] ?? ''}`);
    console.log(`  our ingredients: ${p.ingredients.join(', ') || '-'}`);
    console.log(`  score: ${s.score} ${s.level}`);
  }
})();
