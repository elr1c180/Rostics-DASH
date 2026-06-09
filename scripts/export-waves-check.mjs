import { writeWavesSummary } from "../server/wavesExportService.mjs";

const { outputPath, data } = await writeWavesSummary(process.cwd());

console.log(JSON.stringify({
  output: outputPath,
  summaryRows: data.summary.length,
  shopRows: data.shops.length,
}, null, 2));
