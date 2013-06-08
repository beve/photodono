var profile = (function(){
	return {
		basePath: "./",
		releaseDir: "../../public/js",
		releaseName: "lib",
		action: "release",

		packages:[{
			name: "dojo",
			location: "../dojo"
		},{
			name: "dijit",
			location: "../dijit"
		},{
			name: "dojox",
			location: "../dojox"
		},{
			name: "photodono",
			location: "."
		}],
		cssOptimize: 'comments',
		mini: false,
		optimize: 'closure',
		layerOptimize: 'closure',
		stripConsole: 'all',
		selectorEngine: 'lite',
		layers: {
			"dojo/dojo": {
				include: [ "dojo/dojo", "dojo/i18n", "dojo/domReady", "app/main", "app/run" ],
				customBase: true,
				boot: true
			},
			"photodono/photodono": {
				include: [ "app/Dialog" ]
			}
		},
		staticHasFeatures: {
			'dojo-trace-api': 0,
			'dojo-log-api': 0,
			'dojo-publish-privates': 0,
			'dojo-sync-loader': 0,
			'dojo-test-sniff': 0
		}
	};
})();

