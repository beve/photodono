
var initModule = "captain/main";

dojoConfig = {
  hasCache: {
    "host-node": 1,
    "dom": 0,
    "dojo-built": 1
  },
  trace: 1,
  async: 1,
  baseUrl: "src/",
  packages: [{
    name: "dojo",
    location: "dojo"
  },{
    name: "dijit",
    location: "dijit"
  },{
    name: "dojox",
    location: "dojox"
  },{
    name: "captain",
    location: "captain"
  }],
  deps: [initModule]
}

require("./src/dojo/dojo.js");
