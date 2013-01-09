var SM;
var photoNum;
var photos;
var imgWidth = 300;
var imgHeight = 300;
var wallFluid = {};
var wallLines = 1;
var selectedPath = '';
var currentLevel = 0;
var hierarchy = {};

window.addEvent("domready", function(){
	Locale.use('fr-FR');
	refreshWall('', true);
	initSliders();
});

function initSliders() {
	document.getElements('div.section-container').each(function(container) {
		new Slider(container.getElement('div.cat-backslider'), container.getElement('div.cat-slider'), {
			range: [0, 100],
			mode: 'vertical',
			onChange: function() {  
				var num = (container.getElements('div.cat-section-item').length*17)/100*this.step;
				container.getElement('div.cat-section').scrollTo(0, num);
			}
		});
	});
}

function refreshSliders() {
	document.getElements('div.section-container').each(function(container) {
		if (container.getElements('div.cat-section-item').length > 7) {
			container.getElement('div.cat-slider').setStyle('display', 'block');
		} else {
			container.getElement('div.cat-slider').setStyle('display', 'none');
		}
	});
}

function buildWall(photos, p) {
	photoNum = 0;
	var w = Math.ceil(photos.length/wallLines)*imgWidth;
	$('wall').empty();
	path = p || '';
	var src;

	wallFluid = new Wall("wall", {
		"draggable":true,
		"inertia":true,
		"width":imgWidth,
		"height":imgHeight,
		"autoposition":false,
		"rangex":[0, photos.length],
		"rangey":[0, wallLines],
		callOnUpdate: function(items){
			items.each(function(e, i){
				if (photoNum >= photos.length) {
					src = "/img/null.gif";
				} else {
					src = photos[photoNum];
				}
				if (photos[photoNum]) {
					var img = new Element("img[src="+src+']').set('pouet', photoNum);
					img.addEvent('mouseup', function() {
						if (!wallFluid.getMovement()) {
							openModal(img, path);
						}
					});
					img.inject(e.node).fade("hide").fade("in");
				}
				e.node.setStyle("background", "url(/img/null.gif) no-repeat center center");
				photoNum += 1;
			});
		}
	});

  wallFluid.initWall();
}

function refreshWall(path, bh) {
	var p = '/'+path || '';
	new Request.JSON({
		'url': '/photos',
		onSuccess: function(res) {
			photos = res.photos;
			if (wallFluid.wallDrag)
				wallFluid.wallDrag.detach();
			buildWall(photos, path);
			if (bh === true) {
				hierarchy = res.hierarchy;
				buildHierarchy(hierarchy, 1, 'root');
				refreshSliders();
			}
		}
	}).get({path: p});
}

function buildHierarchy(h, level, parentFolder) {
	var nameWidthPath = '';
	var selectedPathArray = selectedPath.split('||');
	var process = false;
	var nameWithPathArray = [];
	Object.each(h, function(child, name) {
		process = false;
		nameWithPath = (level == 1) ? name : parentFolder+'||'+name;
		nameWithPathArray = nameWithPath.split('||');
		if (typeOf($('section-container'+level)) != 'element') {
			return false;
		}
		for(i=0;i<nameWithPathArray.length;i++) {
			if (nameWithPathArray[i] == selectedPathArray[i]) {
				process = true;
			} else if (i > selectedPathArray.length || (selectedPathArray.length == i && nameWithPath.indexOf(selectedPath) == -1) || ( i == 2 && nameWithPath.indexOf(selectedPath))) {
				process = false;
			}
		}
		var container = $('section-container'+level);
		var containerStyle = container.getStyle('display');

		if (level == 1 || process) {
			var linkMatch = name.match(new RegExp(/([0-9]*_+)(.*)/));
			var linkName = (typeOf(linkMatch == 'array') && linkMatch.length > 0) ? linkMatch[2] : name;
			var link = new Element('a').set('html', linkName).addEvent('click', showFolder.pass([nameWithPath, level]));
			if (name == selectedPathArray[level-1]) {
				link.addClass('active');
			}
			$('section'+level).adopt(new Element('div').addClass('cat-section-item').adopt(link));
			if (containerStyle == 'none') {
				container.setStyle('display', 'block');
			}
		}
		if (typeOf(child) == 'object') {
			buildHierarchy(child, level+1, nameWithPath);
		}
	});
}

function showFolder(path, level) {
	selectedPath = path;
	currentLevel = level;
	[1,2,3].each(function(num) {
		$('section'+num).empty();
		$('section-container'+num).setStyle('display', 'none');
	});
	buildHierarchy(hierarchy, 1, 'root');
	refreshWall(path, false);
	refreshSliders();
}

function openModal(img, p) {
	path = p || '';
	var tmp = img.get('src').split('/');
	var linkMatch = tmp[tmp.length-2].match(new RegExp(/([0-9]*_+)(.*)/));
	var winName = (typeOf(linkMatch == 'array') && linkMatch.length > 0) ? linkMatch[2] : tmp[tmp.length-2];
	var id = img.get('pouet');
	var prev = Math.round(id)-1;
	var next = Math.round(id)+1;
	SM = new SimpleModal({
    "overlayOpacity":0.6
	});
	SM.addButton("<<", "btn btn-prev", function(){
		updateModal(path, 'prev');
	});
	SM.addButton(">>", "btn btn-next", function(){
		updateModal(path, 'next');
	});
	SM.show({
		"model":"modal-ajax",
		"title": '<span style="font-size: 12px">'+winName+'</span>' ,
		"param":{
			"url":img.get('src').replace('_min', ''),
			"photoNum" : id
		}
	});
	if (prev < 0 || !photos[prev]) {
		$('simple-modal').getElement('.btn-prev').setStyle('display', 'none');
	}
	if (!photos[next]) {
		$('simple-modal').getElement('.btn-next').setStyle('display', 'none');
	}
}

function updateModal(p, sens) {
	var img = $('simple-modal').getElement(".contents").getElement('img');
	var id = img.get('pouet');

	if (sens == 'prev') {
		id = Math.round(id)-1;
	} else {
		id = Math.round(id)+1;
	}
	var prev = Math.round(id)-1;
	var next = Math.round(id)+1;
	if (prev < 0 || !photos[prev]) {
		$('simple-modal').getElement('.btn-prev').setStyle('display', 'none');
	} else {
		$('simple-modal').getElement('.btn-prev').setStyle('display', 'inline-block');
	}
	if (!photos[next]) {
		$('simple-modal').getElement('.btn-next').setStyle('display', 'none');
	} else {
		$('simple-modal').getElement('.btn-next').setStyle('display', 'inline-block');
	}
	var im = new Element('img[src='+photos[id]+']').set('pouet', id);
	new Asset.images(im.get('src').replace('_min', ''), {
		onProgress: function(i) {
			immagine = this;
		},
		onComplete: function() {
			try{
				immagine.set('pouet', id);
				$('simple-modal').getElement(".contents").empty();
				$('simple-modal').removeClass("loading");
				var content = $('simple-modal').getElement(".contents");
				var padding = content.getStyle("padding").split(" ");
				var width   = (immagine.get("width").toInt()) + (padding[1].toInt()+padding[3].toInt()+30);
				var height  = immagine.get("height").toInt();
				var myFx1 = new Fx.Tween($("simple-modal"), {
					duration: 'normal',
					transition: 'sine:out',
					link: 'cancel',
					property: 'width'
				}).start($("simple-modal").getCoordinates().width, width);
				var myFx2 = new Fx.Tween(content, {
					duration: 'normal',
					transition: 'sine:out',
					link: 'cancel',
					property: 'height'
				}).start(content.getCoordinates().height, height).chain(function(){
					immagine.inject( $('simple-modal').getElement(".contents").empty() ).fade("hide").fade("in");
					var tmp = immagine.get('src').split('/');
					var linkMatch = tmp[tmp.length-2].match(new RegExp(/([0-9]*_+)(.*)/));
					var winName = (typeOf(linkMatch == 'array') && linkMatch.length > 0) ? linkMatch[2] : tmp[tmp.length-2];
					$("simple-modal").getElement('.simple-modal-header').getElement('h1').set('html', '<span style="font-size: 12px">'+winName+'</span>');
				}.bind(this));
					var myFx3 = new Fx.Tween($("simple-modal"), {
						duration: 'normal',
						transition: 'sine:out',
						link: 'cancel',
						property: 'left'
					}).start($("simple-modal").getCoordinates().left, (window.getCoordinates().width - width)/2);
				}catch(err){}
			}.bind(this)
		});
}

function moveWall(direction) {
	var num = wallFluid.getCoordinatesFromId(wallFluid.getActiveItem()).c;
	if (direction == 'next') {
		num += 5;
	} else {
		num -= 5;
	}
	wallFluid.moveTo(num, 0);
}
