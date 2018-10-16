const fs = require('fs');
const path = require('path');

const readFile = (path, encoding = null, errTitle = 'READ FILE ERR') => {
	try {
		return fs.readFileSync(
			path,
			encoding
		)
	} catch (e) {
		console.log(e);
		switch (e.code) {
			case 'ENOENT':
				throw new Error('File not found', e)
				break
			default:
				throw e
		}
	}
}

const writeFile = (path, content = null, callBack = function(){}) => {
	try {
		return fs.writeFile(
			path,
			content,
			callBack
		)
	} catch (e) {
		console.log(e);
		switch (e.code) {
			case 'ENOENT':
				throw new Error('File not found', e)
				break
			default:
				throw e
		}
	}
}

const writeFileRelative = (relativePath, encoding = null, errTitle = 'READ FILE ERR') => {
	return writeFile(path.resolve(process.cwd(), relativePath), encoding, errTitle);
}

const readFileRelative = (relativePath, encoding = null, errTitle = 'READ FILE ERR') => {
	return readFile(path.resolve(process.cwd(), relativePath), encoding, errTitle);
}

module.exports = {
	readFile,
	readFileRelative,
	writeFileRelative
}