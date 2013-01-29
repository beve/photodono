define(['dojo/_base/declare', 'dojo/Evented', 'dojo/_base/lang', 'dojo/dom', 'dojo/dom-geometry', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/fx', 'dojo/on'], function(declare, Evented, lang, dom, domGeom, domConstruct, domStyle, fx, on) {

  return declare([Evented], {

    numPhotosLoaded: 0,

    elementDimensions: {w: 100, h: 100},
    prevBtnId: 'prev',
    nextBtnId: 'next',

    position: {x: 0, y: 0, l: 1, t: 1},

    constructor: function(el, options) {
      lang.mixin(this, options || {});
      this.build(el);

    },

    build: function(el) {
      this.container = (typeof el == 'element') ? el : (dom.byId(el));
      var containerBox = domGeom.getMarginBox(this.container);
      var self = this;
      this.grid = domConstruct.create('div', {id: 'simple-grid', style: {width: containerBox.w+this.elementDimensions.w, height: containerBox.h+this.elementDimensions.h}}, this.container);
      on(dom.byId(this.prevBtnId), 'click', function() {
        self.move();
      });
      on(dom.byId(this.nextBtnId), 'click', function() {
        self.move();
      });

    },

    adopt: function(childs) {
      var self = this;
      childs.forEach(function(url, i) {
        if (i < 2) {
          var parent = domConstruct.create('div', {'class': 'miniature', style: {width: self.elementDimensions.w, height: self.elementDimensions.h}}, self.grid);
          domConstruct.create('img', {src: url}, parent);
        }
      });

    },

    move: function(x, y) {
      console.log(domGeom.getMarginBox(this.grid));
      fx.slideTo({
        node: this.grid,
        top: 0,
        left: domGeom.l+=50,
        unit: "px"
      }).play();
    }

  });

});