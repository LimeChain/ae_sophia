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

const writeFile = (path, content) => {
	// try {
	// 	return fs.writeFile(
	// 		path,
	// 		content,
	// 		callBack
	// 	)
	// } catch (e) {
	// 	console.log(e);
	// 	switch (e.code) {
	// 		case 'ENOENT':
	// 			throw new Error('File not found', e)
	// 			break
	// 		default:
	// 			throw e
	// 	}
	// }
	// console.log("from fs: " + content)
	fs.writeFileSync(path, content);
}

const writeFileRelative = async (relativePath, content = null) => {
	return writeFile(path.resolve(process.cwd(), relativePath), content);
}

const readFileRelative = (relativePath, encoding = null, errTitle = 'READ FILE ERR') => {
	return readFile(path.resolve(process.cwd(), relativePath), encoding, errTitle);
}

const fileExists = (relativePath) => {
	return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

const trimAdresseses = (addressToTrim) => {
	return addressToTrim.substring(3)
}

function toHexString(byteArray) {
	return Array.from(byteArray, function (byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
}

module.exports = {
	readFile,
	readFileRelative,
	writeFileRelative,
	fileExists,
	trimAdresseses,
	toHexString
}