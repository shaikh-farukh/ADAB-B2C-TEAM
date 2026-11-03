const fs = require('fs');
const path = require('path');
const pool = require('../db');

function parseMarkdownDoc() {
  const catalogPath = path.resolve(__dirname, '../../ADAB_DATABASE_TABLES_CATALOG.md');
  const legacyPath = path.resolve(__dirname, '../../DATABASE_TABLES_AND_COLUMNS1.md');
  const mdPath = fs.existsSync(catalogPath) ? catalogPath : legacyPath;
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');

  const tables = {};
  let currentTable = null;
  let inTableSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const tableHeaderMatch = line.match(/^###\s+\d+\.\s+`?([a-zA-Z0-9_]+)`?/);
    if (tableHeaderMatch) {
      currentTable = tableHeaderMatch[1].toLowerCase();
      tables[currentTable] = { columns: [], constraints: [] };
      inTableSection = false;
      continue;
    }

    if (!currentTable) continue;

    // Check table rows: | 1 | **`id`** | `UUID` | PRIMARY KEY ... |
    if (line.startsWith('|') && line.includes('`')) {
      const parts = line.split('|').map(p => p.trim());
      // parts[0] is empty, parts[1] is #, parts[2] is col, parts[3] is type, parts[4] is modifier
      if (parts.length >= 4 && parts[1] !== '#' && parts[1] !== ':-:' && !parts[2].includes('---')) {
        const colMatch = parts[2].match(/`([a-zA-Z0-9_]+)`/);
        const typeMatch = parts[3].match(/`?([^`]+)`?/);
        if (colMatch && typeMatch) {
          const colName = colMatch[1].toLowerCase();
          const colType = typeMatch[1].trim();
          const modifiers = parts[4] || '';
          tables[currentTable].columns.push({
            name: colName,
            type: colType,
            modifiers: modifiers
          });
        }
      }
    }
  }

  return tables;
}

async function analyze() {
  console.log('1. Parsing schema catalog...');
  const docTables = parseMarkdownDoc();
  const docTableNames = Object.keys(docTables);
  console.log(`Parsed ${docTableNames.length} tables from Markdown.`);

  console.log('2. Querying live Neon database schema...');
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const dbTables = {};
  res.rows.forEach(r => {
    const t = r.table_name.toLowerCase();
    if (!dbTables[t]) dbTables[t] = new Map();
    dbTables[t].set(r.column_name.toLowerCase(), r);
  });
  const dbTableNames = Object.keys(dbTables);
  console.log(`Found ${dbTableNames.length} tables currently in Neon database.`);

  // 1. Missing tables
  const missingTables = docTableNames.filter(t => !dbTables[t]);
  console.log(`\n==================================================`);
  console.log(`MISSING TABLES IN NEON (${missingTables.length}):`);
  console.log(`==================================================`);
  missingTables.forEach((t, i) => console.log(`${i + 1}. ${t}`));

  // 2. Extra tables in DB not in doc
  const extraDbTables = dbTableNames.filter(t => !docTables[t]);
  console.log(`\n==================================================`);
  console.log(`EXTRA TABLES IN DB NOT IN DOC (${extraDbTables.length}):`);
  console.log(`==================================================`);
  extraDbTables.forEach((t, i) => console.log(`${i + 1}. ${t}`));

  // 3. Column differences in existing tables
  console.log(`\n==================================================`);
  console.log(`MISSING COLUMNS IN EXISTING TABLES:`);
  console.log(`==================================================`);
  const missingColumnsByTable = {};

  for (const t of docTableNames) {
    if (!dbTables[t]) continue; // table itself is missing
    const docCols = docTables[t].columns;
    const dbCols = dbTables[t];

    const missingInDb = docCols.filter(c => !dbCols.has(c.name));
    if (missingInDb.length > 0) {
      missingColumnsByTable[t] = missingInDb;
      console.log(`Table "${t}": ${missingInDb.length} missing column(s):`);
      missingInDb.forEach(c => console.log(`   + ${c.name} (${c.type}) [${c.modifiers}]`));
    }
  }

  // Save analysis to JSON
  fs.writeFileSync('scripts/schema_diff.json', JSON.stringify({
    missingTablesCount: missingTables.length,
    missingTables,
    extraDbTables,
    missingColumnsByTable
  }, null, 2));

  console.log('\nWrote scripts/schema_diff.json');
  process.exit(0);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
