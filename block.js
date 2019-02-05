/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(body){
     this.hash = "",
     this.height = 0,
     this.body = body,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

module.exports.Block = Block;
