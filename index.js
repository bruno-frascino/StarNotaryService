const express = require('express');
const app = express();
const bc = require('./simpleChain.js');
const sc = new bc.Blockchain();
const blk = require('./block.js');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const path = require('path');


//Home 
app.get('/', 
  (req, res) => {

    //html welcome page
    res.sendFile(path.join(__dirname + '/home.html'));
});

//POST Validation User Request
app.post('/requestValidation', 
  (req, res) => {
    //wallet address param
    const address = req.body.address;
  
    //validate input parameters
    if( address != null && address.length > 0 ) {

      let currentTime = new Date().getTime().toString().slice(0,-3);
    
      sc.requestValidation(address, currentTime)
        .then( (requestTime) => {
          res.json(
            {
              address: address,
              requestTimeStamp: requestTime,
              message: address+':'+requestTime+':'+'starRegistry',
              validationWindow: sc.getTimeWindow()
            }
          );

        })
        .catch(err => {
          console.log(err.message);
          res.send('Unexpected error when requesting validation - ' + err.message);
        });
    }
    //invalid input parameter
    else {
      res.send('Invalid input parameter - Address cannot be empty.');
    }
    
  });


  //POST User Message Signature
app.post('/message-signature/validate', 
(req, res) => {
  //wallet address
  const address = req.body.address;
  //signed message
  const signature = req.body.signature;
  
  //validate input parameters
  if( address != null && address.length > 0 
      && signature != null && signature.length > 0) {

    //Response data
    let message = '';
    let requestTime = '';

    //retrieve the time it was requested
    sc.getPermissionData(address)
      .then(permData => {
        requestTime = JSON.parse(permData).requestTime;

        //response data
        message = `${address}:${requestTime}:starRegistry`;
        
        //validate signature
        return sc.validateSignature(address, requestTime, message, signature);
      })
      .then( () => { 

          res.send( 
            {
              "registerStar": true,
              "status": {
                "address": address,
                "requestTimeStamp": requestTime,
                "message": message,
                "validationWindow": sc.getTimeWindow(),
                "messageSignature": "valid"
              }
            }
          );
      })
      //invalid signature, time window expired or couldn't find request time
      .catch( isInvalidSignature => {

        //in case the signature or the time window has expired
        if( typeof(isInvalidSignature) == typeof(true) ){

          res.send(  
            {
              "registerStar": false,
              "status": {
                "address": address,
                "requestTimeStamp": requestTime,
                "message": message,
                "validationWindow": sc.getTimeWindow(),
                "messageSignature": "invalid"
              }
            }
          );
        }
        //error from LevelDB that couldn't find the time request
        else{
          res.send('Error - Validation request for this address was not found.');
        }
      })
    }
    //Invalid parameters
    else{
      res.send('Invalid input parameters - Address and signature cannot be empty.');
    }
});

//GET Block BY Address
app.get('/stars/address:address', 
(req, res) => {

  let address = req.params.address
  
  //remove colon
  address = address.indexOf(':') == 0 ? address.substring(1) : address;

  sc.getBlockByAddress(address)
    .then(blocks => {
      res.send(blocks);
    })
    .catch(err => {
      const msg = 'Block could not be found - error: ' + err.message;
      console.log(msg);
      res.send(msg);
    });

});

//GET Block by Hash
app.get('/stars/hash:hash', 
(req, res) => {

  let hash = req.params.hash
  //remove colon
  hash = hash.indexOf(':') == 0 ? hash.substring(1) : hash;

  sc.getBlockByHash(hash)
    .then(block => {
      res.send(block);
    })
    .catch(err => {
      const msg = 'Block could not be found - error: ' + err.message;
      console.log(msg);
      res.send(msg);
    });
});


//GET Block by Block Height
app.get('/block/:height',
  (req, res) => {

    let height = req.params.height
    //remove colon
    height = height.indexOf(':') == 0 ? height.substring(1) : height;

    sc.getBlockByHeight(height)
      .then(block => {
        res.send(JSON.parse(block));
      })
      .catch(err => {
        const msg = 'Block could not be found - error: ' + err.message;
        console.log(msg);
        res.send(msg);
      });
});

//POST Block
app.post('/block', 
  (req, res) => {
  
    let emptyInputs = true;
    let badStory = true;

    //validate input
    if( req.body.body != null ){

      const address = req.body.body.address;
      if( address != null && address.length > 0 
          && req.body.body.star != null ){

        const ra = req.body.body.star.ra;
        const dec = req.body.body.star.dec;
        const story = req.body.body.star.story;

        if( ra != null && ra.length > 0
            && dec != null && dec.length > 0
            && story != null && story.length > 0 ){

          emptyInputs = false;
          if( isASCII(story) && story.length <= 250 ){
            
            badStory = false;

            sc.registerAStar(req.body.body)
            .then( addedBlock => {
    
              res.send(addedBlock);
    
            })
            .catch( error => {
              res.send(error);
            });
          }
        }
      }
    }

    if(emptyInputs){
      res.send('Invalid input parameters - Address and all the Star coordinates are required information.');
    }
    if(badStory && !emptyInputs){
      res.send('Star story should be in ascii text and it is limited to 250 words.');
    }
});

function isASCII(text) {
  return /^[\x00-\x7F]+$/.test(text);
}

app.listen(8000, () => console.log('REST Services for SimpleChain listening on port 8000!'));