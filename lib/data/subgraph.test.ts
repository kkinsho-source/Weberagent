import { subgraphFor } from './graph';

const g = subgraphFor(['2330']);
console.log(`2330 subgraph: ${g.nodes.length} nodes, ${g.edges.length} edges`);
const syms = g.nodes.map((n) => n.id).sort().join(',');
console.log('nodes:', syms);

// 題材模式：ic_design_asic 應含 5 家公司
const t = subgraphFor(['3443', '3661', '3035', '6643', '6533'], false);
console.log(`theme subgraph: ${t.nodes.length} nodes, ${t.edges.length} edges`);

if (g.nodes.length >= 10 && syms.includes('2330')) {
  console.log('OK');
  process.exit(0);
} else {
  console.error('FAIL: subgraph too small');
  process.exit(1);
}
