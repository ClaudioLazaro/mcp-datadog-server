import { datadogRequest } from '../src/http.js';

async function fetchAllMonitors({ pageSize = 100, maxPages = 50 } = {}) {
  const all = [];
  for (let page = 0; page < maxPages; page++) {
    const res = await datadogRequest({
      method: 'GET',
      rawUrlTemplate: '{{baseUrl}}/api/v1/monitor',
      query: { page, page_size: pageSize },
    });
    if (!res.ok) {
      const errText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      throw new Error(`Falha ao listar monitores: HTTP ${res.status} ${errText}`);
    }
    const items = Array.isArray(res.data) ? res.data : [];
    all.push(...items);
    if (items.length < pageSize) break; // última página
  }
  return all;
}

function toRow(m) {
  const tags = Array.isArray(m.tags) ? m.tags.join(',') : '';
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    tags,
  };
}

async function main() {
  try {
    const monitors = await fetchAllMonitors({ pageSize: 100 });
    if (!monitors.length) {
      console.log('Não foram encontrados monitores no Datadog.');
      return;
    }
    const rows = monitors.map(toRow);
    console.table(rows);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

main();

