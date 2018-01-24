const artifacts = ['RequestCore',
					'RequestBurnManagerSimple',
					'RequestEthereum'];

const PACKAGE = require('./package.json');
const fs = require('fs');
const BUILD_DIR = './build/contracts/';
const EXPORT_DIR = './export/';

artifacts.forEach(function(name) {
	const artifact = require(BUILD_DIR+name+'.json');

	let artifactForTestExported = {
		contractName: artifact.contractName,
		abi: artifact.abi,

		bytecode: artifact.bytecode,
		compiler: artifact.compiler,
		version: PACKAGE.version,
		networks: {
			private: {
				address: '0x8cdaf0cd259887258bc13a92c0a6da92698644c0',
				blockNumber: 0,
			}
		}
	};

	let artifactForProdExported = {
		contractName: artifact.contractName,
		abi: artifact.abi,
		version: PACKAGE.version,
		networks: {
			rinkeby: {
				address: '',
				blockNumber: 0,
			}
		}
	};
	
	fs.writeFile(EXPORT_DIR+'test/'+name+'.json', JSON.stringify(artifactForTestExported, null, 2), function(err) {
		if(err) {
			return console.log(err);
		}
		console.log(EXPORT_DIR+'test/'+name+'.json saved!');
	}); 
	
	fs.writeFile(EXPORT_DIR+'prod/'+name+'.json', JSON.stringify(artifactForProdExported, null, 2), function(err) {
		if(err) {
			return console.log(err);
		}
		console.log(EXPORT_DIR+'prod/'+name+'.json saved!');
	}); 
});
