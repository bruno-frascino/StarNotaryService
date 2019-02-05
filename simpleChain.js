/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
const blockStorage = require('./levelSandbox.js');
const serviceStorage = require('./serviceStorage.js');
let blk = require('./block.js');
let star = require('./star.js');
let blkBody = require('./block-body');
const bitcoin = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
const endeHelper = require('./en-deHelper');

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{

  constructor(){

    this.timeWindow = 300;

    this.getBlockHeight()
      .then(height => {
        if( height < 0 ){
          
          let starGen = new star.Star('', '', 'First block in the chain - Genesis block');
          let blockBody = new blkBody.BlockBody('', starGen);

          this.addBlock(new blk.Block(blockBody))
            .then( ret => {
                if(ret === true) console.log('Genesis Block added successfully.');
                else console.log('Genesis Block not added.');
              });
        }
      })
      .catch(error => console.log('Unexpected error initializing the Blockchain', error.message));
  }

  // Get block height
  getBlockHeight(){
    return blockStorage.getTotalItems();
  }

  // Add new block
  addBlock(newBlock){
    return new Promise( (resolve, reject) => {
    
      // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    
    this.getBlockHeight()
      .then( blockHeight => { 
        newBlock.height = blockHeight + 1;
        return this.getBlock(blockHeight);
      })
      .then( blockJson => {

        let blockObject = JSON.parse(blockJson);
        newBlock.previousBlockHash = blockObject.hash;
        return new Promise( (resolve, reject) => {
          resolve()
        });
        }, 
        error => {
          //we get this error when first block to be added
          //so it can't find one. do nothing and go back to thening
          return new Promise( (resolve, reject) => {
            resolve()
          });
      })
      .then( () => {

        let storyBytes = new Buffer(newBlock.body.star.story, "ascii");
        //encode star story to ascii
        let storyHex = Buffer.from(storyBytes).toString('hex');
        newBlock.body.star.story = storyHex;
          
        // Block hash with SHA256 using newBlock and converting to a string
        newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

        //Saving block onto the chain
        return blockStorage.addLevelDBData(newBlock.height, JSON.stringify(newBlock))

      })
      .then(() => {
        resolve(true);
      })
      .catch(err => {
        console.log(err.message);
        resolve(false);
      });

    });
  }

  //
  getBlock(blockHeight){
    return blockStorage.getLevelDBData(blockHeight);
  }

  //
  getBlockByHeight(blockHeight){
    
    return new Promise( (resolve, reject) =>{
      this.getBlock(blockHeight)
      .then(jBlock => {
          
        let blk = JSON.parse(jBlock);
        //Decode Star story - unless it's genesis block.
        if(blk.height > 0) {
          blk.body.star.storyEncoded = blk.body.star.story;
          const storyDec = endeHelper.decodeHexToAscii(blk.body.star.story);
          blk.body.star.story = storyDec;
          
        }
        resolve(JSON.stringify(blk));
      })
      .catch(err => {
        reject(err);
      }); 
    
    });

  }

  // get Block by Address
  getBlockByAddress(address){

    let blocksResult = [];
    return new Promise( (resolve, reject) =>{
      blockStorage.findByAddress(address)
      .then(blocks => {
        if( blocks != null){
          for( let i=0; i<blocks.length; i++){
            let block = blocks[i];

            //Decode Star story - unless it's genesis block.
            if(block.height > 0) {
              block.body.star.storyEncoded = block.body.star.story;
              const storyDec = endeHelper.decodeHexToAscii(block.body.star.story);
              block.body.star.story = storyDec;
            }
            blocksResult.push(block);
          }
          resolve(blocksResult);
        }
        //Not Found
        else{
          reject({message: 'No block could be found for this hash value.'})
        }
      })
      .catch(err => {
        reject(err);
      }); 
    
    });
  }

  // get Block by Hash
  getBlockByHash(hash){

    return new Promise( (resolve, reject) =>{
      blockStorage.findByHash(hash)
      .then(blk => {
          
        if( blk != null){
          //Decode Star story - unless it's genesis block.
          if(blk.height > 0) {
            blk.body.star.storyEncoded = blk.body.star.story;
            const storyDec = endeHelper.decodeHexToAscii(blk.body.star.story);
            blk.body.star.story = storyDec;
          }
          resolve(blk);
        }
        //Not Found
        else{
          reject({message: 'No block could be found for this hash value.'})
        }
      })
      .catch(err => {
        reject(err);
      }); 
    
    });
  }

  // validate block
  //returns promise resolved with 'true' or 'false'
  validateBlock(blockHeight){
    console.log('Validating block: ', blockHeight);
    
    return new Promise( (resolve, reject) => {

      // get block object
      this.getBlock(blockHeight)
        .then( jBlock => {
          let block = JSON.parse(jBlock);
          // get block hash
          let blockHash = block.hash;
          // remove block hash to test block integrity
          block.hash = '';

          // generate block hash
          let validBlockHash = SHA256(JSON.stringify(block)).toString();
          // Compare
          if (blockHash === validBlockHash) {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(err => console.log('Error getting Block #' + blockHeight + ' - ' + err.message));
    });
  }
    
  //Validate blockchain
  validateChain(){
    
    let validateBlocks = [];
    let blocks = [];
    let errorLog = [];

    this.getBlockHeight()
      .then( height => {
      
        //validate each block
        for(let i=0; i<height+1; i++){
          validateBlocks.push(this.validateBlock(i));
        }

        return Promise.all(validateBlocks);
      })
      .then( validation => {
        let vHeight = validation.length;
        //check if any block failed validation
        for(let i=0; i<vHeight; i++){
          if(validation[i] == false){
            console.log('Block ' + i + ' invalid.')
            errorLog.push(i);
          } 
          else
            console.log('Block ' + i + ' valid.')
          
          blocks.push(this.getBlock(i));
        }
      
        //get all the blocks to validate the chain
        return Promise.all(blocks);
      })
      .then( listBlocks => {
        let lHeight = listBlocks.length;

        for(let i=0; i<lHeight; i++){
        
          let lBlock = JSON.parse(listBlocks[i]);
          // compare blocks hash link
          let blockHash = lBlock.hash;

          //check for the last item
          if(i < lHeight-1){
            let nextBlock = JSON.parse(listBlocks[i+1]);
            let previousHash = nextBlock.previousBlockHash;          

            //Check link between blocks
            if (blockHash !== previousHash) {
              errorLog.push(i);
            }
            else{
              console.log('Previous hash of Block ' + (i+1) + ' is valid');
            }
          }
        }
        if(errorLog.length > 0){
          console.log('Blockchain Invalid!');
          console.log('Block errors = ' + errorLog.length);
          console.log('Blocks: '+errorLog);
        }
        else {
          console.log('No errors detected');
        }
      })
      .catch(error => console.log('Unexpected Error: ', error.message) );
  }
  
  // Save permission details
  savePermissionData(address, permission){
    return serviceStorage.addLevelDBData(address, JSON.stringify(permission));
  }

  // getRequestTime
  getPermissionData(address){
    return serviceStorage.getLevelDBData(address);
  }

  //
  deletePermissionData(address){
    return serviceStorage.removeLevelDBData(address);
  }

  //
  requestValidation(address, currentTime){
    return new Promise((resolve, reject) => {
      
      let requestTimeToReturn = currentTime;

      //this.getRequestTime( address )
      this.getPermissionData( address )
      .then( permData => {

        const requestTime = JSON.parse(permData).requestTime;

        //check how much time has passed
        const isValid = this.isValidTimeWindow(requestTime, currentTime);

        //time expired - update the db with
        //the current time so the time window
        //start over again
        if( !isValid ){
          return new Promise( (resolve, reject) => {
            resolve(true);//true to save the new time
          });
        }
        //within time window - just have to return
        //response with the decreased time window
        else{
          requestTimeToReturn = requestTime;
          return new Promise( (resolve, reject) => {
            resolve(false);//false to save the new time
          });
        }
      },
        err => {
          //first request time - it has to be saved
          return new Promise( (resolve, reject) => {
            resolve(true);//true to save the new time
          });
        }
      )
      .then( isTimeToSave => {

        //first or expired request time
        if(isTimeToSave){ 
          //not validated yet
          let permData = {
            requestTime: requestTimeToReturn,
            permission: false
          };
          return this.savePermissionData(address, permData);
        }
        //within time window
        else{
          return new Promise( (resolve, reject) => {
            resolve();
          });
        }
      })
      .then( () => {
        //either initial or new requestTime
        resolve(requestTimeToReturn);
      })

    });
  }

  //
  isValidTimeWindow(initialTime, finalTime){

    let delta = parseInt(finalTime) - parseInt(initialTime);
    this.timeWindow = this.timeWindow - delta;
    const isValid = this.timeWindow > 0;
    if( !isValid )
      this.timeWindow = 300;
    return isValid;
  }

  //
  getTimeWindow(){
    return this.timeWindow;
  }

  //
  validateTimeWindow(requestTime){

    return new Promise( (resolve, reject) => {
      const validationTime = new Date().getTime().toString().slice(0,-3);

      if( !this.isValidTimeWindow(requestTime, validationTime) ){
        console.log('Validation time window expired.');
        reject();
      }
      else {
        resolve();
      }    
    });
  }

  //
  isValidSignature(address, message, signature){
    let isValid = false;
    try{
      isValid = bitcoinMessage.verify(message,address,signature);
    }
    catch(err){
      console.log('Invalid signature.');
      console.log(err);
    }
    return isValid;
  }

  //
  validateSignature(address, requestTime, message, signature){
    return new Promise((resolve, reject) => {

      this.validateTimeWindow(requestTime)
        .then( () => {

          const isValid = this.isValidSignature(address, message, signature);

          if( isValid ){
            let permData = {
              requestTime: requestTime,
              permission: true
            };
            return this.savePermissionData(address, permData);
          }
          else {
            console.log('Invalid Signature');
            return new Promise( (resolve, reject) => {
              resolve(true);
            });
          }

        },
        error => {
          return new Promise( (resolve, reject) => {
            resolve(true);
          });
        })
        .then( isInvalid => {

          if( typeof(isInvalid) == typeof(true) ){
            reject(true);
          }
          else{
            resolve();  
          }
        })
    });
  }

  //
  registerAStar(blockBody){

    return new Promise( (resolve, reject) => {

      let nBlock = new blk.Block(blockBody)

      this.getPermissionData(nBlock.body.address)
        .then( permData => {

          //signature hasn't been validated yet
          if( ! JSON.parse(permData).permission ){
            reject('Signature hasn\'t been validated yet.');
          }
          //valid permission
          else{
            return this.addBlock(nBlock);
          }
        })
        .then( added => {
          
          //some error ocurred adding the block
          if(!added){
            reject('Block could not be added.');
          }
          else{
            //remove permission data
            return this.deletePermissionData(nBlock.body.address);
          }
        })
        .then(() => {
          //get block height to get last block added
          return this.getBlockHeight();
        })
        .then( blockHeight => { 
          return this.getBlock(blockHeight);
        })
        .then( jBlock => {

          //returns block added details
          resolve(JSON.parse(jBlock));
        })
        .catch( err => {
          console.log(err.message);
          //No request validation has been made
          reject('Block could not be added. No validation request has been made yet.');
        })        
      })
  }

}

module.exports.Blockchain = Blockchain;