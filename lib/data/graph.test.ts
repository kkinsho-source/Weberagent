import { stocks } from './mock';
import { toFlowNodes, toFlowEdges } from './graph';

const nodes = toFlowNodes();
const edges = toFlowEdges();

let ok = true;
function check(cond: boolean, msg: string) {
  if (!cond) {
    ok = false;
    console.error('FAIL:', msg);
  }
}

check(nodes.length === stocks.length, `nodes ${nodes.length} != stocks ${stocks.length}`);
check(edges.length > 0, 'no edges generated');

const ids = new Set(nodes.map((n) => n.id));
for (const e of edges) {
  check(ids.has(e.source), `edge source ${e.source} is not a node`);
  check(ids.has(e.target), `edge target ${e.target} is not a node`);
}

if (ok) {
  console.log(`OK: ${nodes.length} nodes, ${edges.length} edges`);
  process.exit(0);
} else {
  process.exit(1);
}
