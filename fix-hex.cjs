const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /color\s*=\s*['"]#6366f1['"]/g, replacement: 'color="rgb(var(--color-primary))"' },
  { regex: /color:\s*['"]#6366f1['"]/g, replacement: "color: 'rgb(var(--color-primary))'" },
  { regex: /COMPLETED:\s*['"]#6366f1['"]/g, replacement: "COMPLETED: 'rgb(var(--color-primary))'" },
  { regex: /ISSUED:\s*['"]#6366f1['"]/g, replacement: "ISSUED: 'rgb(var(--color-primary))'" },
  { regex: /info:\s*['"]#6366f1['"]/g, replacement: "info: 'rgb(var(--color-primary))'" },
  { regex: /ring-\[\#6366f1\]/g, replacement: 'ring-pwc-primary' },
  { regex: /accent-\[\#6366f1\]/g, replacement: 'accent-pwc-primary' },
  { regex: /borderColor:\s*d\s*\?\s*['"]#6366f1['"]/g, replacement: "borderColor: d ? 'rgb(var(--color-primary))'" },
  { regex: /border:\s*`1px solid \$\{i <= stageIdx \? \(i < stageIdx \? '#22c55e44' : '#6366f144'\) : '#2a2f45'\}`/g, replacement: "border: `1px solid ${i <= stageIdx ? (i < stageIdx ? '#22c55e44' : 'rgba(var(--color-primary), 0.27)') : 'rgb(var(--color-border))'}`" },
  { regex: /background:\s*i\s*<\s*stageIdx\s*\?\s*'#22c55e22'\s*:\s*i\s*===\s*stageIdx\s*\?\s*'#6366f122'\s*:\s*'#1e2235'/g, replacement: "background: i < stageIdx ? '#22c55e22' : i === stageIdx ? 'rgba(var(--color-primary), 0.13)' : 'rgb(var(--color-input))'" },
  { regex: /color:\s*i\s*<\s*stageIdx\s*\?\s*'#22c55e'\s*:\s*i\s*===\s*stageIdx\s*\?\s*'#6366f1'\s*:\s*'#6b7280'/g, replacement: "color: i < stageIdx ? '#22c55e' : i === stageIdx ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-muted))'" },
  // And the OtherDashboards gradient backgrounds
  { regex: /bg-\[linear-gradient\(180deg,#15192a_0%,#101423_100%\)\]/g, replacement: 'bg-pwc-bg' },
  // Also LandingPage has gradients but we might ignore LandingPage for now since it's marketing site, though it might be good to replace it too.
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Replaced hexes in ${fullPath}`);
      }
    }
  }
}

processDirectory(dirPath);
console.log('Hex consolidation complete.');
