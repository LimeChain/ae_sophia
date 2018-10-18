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

const writeFile = (path, content, callBack) => {
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
	fs.writeFile(path, content, function(err) {
		if(err) {
			return console.log(err);
		}
	
		// console.log("The file was saved!");
	}); 
}

const writeFileRelative = async (relativePath, content = null, callBack = function(){}) => {
	return writeFile(path.resolve(process.cwd(), relativePath), content, callBack);
}

const readFileRelative = (relativePath, encoding = null, errTitle = 'READ FILE ERR') => {
	return readFile(path.resolve(process.cwd(), relativePath), encoding, errTitle);
}

module.exports = {
	readFile,
	readFileRelative,
	writeFileRelative
}