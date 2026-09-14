const logBuffer = `[23:37:25.492] [main/ERROR] [loading.ModSorter/LOADING]: Missing or unsupported mandatory dependencies:
	Mod ID: 'neoforge', Requested by: 'rha', Expected range: '[21.1.219,)', Actual version: '21.1.65'
	Mod ID: 'neoforge', Requested by: 'create', Expected range: '[21.1.219,)', Actual version: '21.1.65'
net.neoforged.fml.ModLoadingException: Loading errors encountered:
	- Mod copycats requires neoforge 21.1.200 or above`;

const regex1 = /Requested by: '([^']+)'.*?Expected range: '([^']+)'/ig;
const matches1 = [...logBuffer.matchAll(regex1)];
console.log("Matches 1:", matches1.map(m => ({ name: m[1], ver: m[2] })));

const regex2 = /- Mod ([a-zA-Z0-9_.-]+) requires (?:neoforge )?([^\s]+)/ig;
const matches2 = [...logBuffer.matchAll(regex2)];
console.log("Matches 2:", matches2.map(m => ({ name: m[1], ver: m[2] })));
