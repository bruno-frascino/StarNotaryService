/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

// Add data to levelDB with key/value pair
function addLevelDBData(key,value){
  return new Promise( (resolve, reject) => {
    
    db.put(key, value, (err) => {
      if (err) 
        reject(err);
      resolve();
    })

  });
}

function getLevelDBData(key){
  return new Promise( (resolve, reject) => {

    db.get(key, (err, value) => {
        if (err) 
          reject(err);
        resolve(value);
      })
  });  
}

/*
  It gets the total number of items in the database or returns -1 if empty.
  Zero based.
*/
function getTotalItems() {

  return new Promise(function(resolve, reject){     
    let i = -1;
    db.createReadStream()
      .on('data', function(data) {
        i++;
      })
      .on('error', function(err) {
          reject(err); 
      })
      .on('close', function() {
        resolve(i);
      });

  });
}

function findByAddress(address) {

  return new Promise(function(resolve, reject){     
    let blocks = [];
    db.createValueStream()
      .on('data', function(data) {
        let blk = JSON.parse(data);
        if(blk.body.address === address){
          blocks.push(blk);
        }
      })
      .on('error', function(err) {
          reject(err); 
      })
      .on('close', function() {
        resolve(blocks);
      });

  });
}

function findByHash(hash) {

  return new Promise(function(resolve, reject){     
    let block = null;
    db.createValueStream()
      .on('data', function(data) {
        let blk = JSON.parse(data);
        if(blk.hash === hash){
          block = blk;
        }
      })
      .on('error', function(err) {
          reject(err); 
      })
      .on('close', function() {
        resolve(block);
      });

  });
}

module.exports = { addLevelDBData, getLevelDBData, getTotalItems, findByAddress, findByHash};