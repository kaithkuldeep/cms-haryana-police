import fs from 'fs';
import path from 'path';

const filePath = 'd:/cms smart GD 2/cms-haryana-police/src/pages/GD/GDPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix duplicated Select options
const selectBlockRegex = /<Select>([\s\S]*?)<\/Select>/g;
content = content.replace(selectBlockRegex, (match, p1) => {
    const lines = p1.split('\n');
    const uniqueLines = [];
    const seenValues = new Set();
    
    for (let line of lines) {
        const valueMatch = line.match(/value="(.*?)"/);
        if (valueMatch) {
            const val = valueMatch[1];
            if (!seenValues.has(val)) {
                seenValues.add(val);
                uniqueLines.push(line);
            }
        } else {
            uniqueLines.push(line);
        }
    }
    return `<Select>\n${uniqueLines.join('\n')}\n                     </Select>`;
});

fs.writeFileSync(filePath, content);
console.log('✅ Duplicates removed successfully!');
