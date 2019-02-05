/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const serviceDB = './servicedata';
const db = level(serviceDB);

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

function removeLevelDBData(key){
  return new Promise( (resolve, reject) => {

    db.del(key, (err) => {
        if (err) 
          reject(err);
        resolve();
      })
  });  
}

module.exports = {addLevelDBData, getLevelDBData, removeLevelDBData};