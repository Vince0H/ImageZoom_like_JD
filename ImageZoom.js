var ImageZoom = function(image, viewer, options) {
	this._initialize( image, viewer, options );
	this._initLoad();
};

ImageZoom.prototype = {
  //初始化程序
  _initialize: function(image, viewer, options) {
	this._image = $$(image);//原图
	this._zoom = document.createElement("img");//显示图
	this._viewer = $$(viewer);//显示框
	this._viewerWidth = 0;//显示框宽
	this._viewerHeight = 0;//显示框高
	this._preload = new Image();//预载对象
	this._rect = null;//原图坐标
	this._repairLeft = 0;//显示图x坐标修正
	this._repairTop = 0;//显示图y坐标修正
	this._rangeWidth = 0;//显示范围宽度
	this._rangeHeight = 0;//显示范围高度
	this._timer = null;//计时器
	this._loaded = false;//是否加载
	this._substitute = false;//是否替换
	
	var opt = this._setOptions(options);
	
	this._scale = opt.scale;
	this._max = opt.max;
	this._min = opt.min;
	this._originPic = opt.originPic;
	this._zoomPic = opt.zoomPic;
	this._rangeWidth = opt.rangeWidth;
	this._rangeHeight = opt.rangeHeight;
	
	this.delay = opt.delay;
	this.autoHide = opt.autoHide;
	this.mouse = opt.mouse;
	this.rate = opt.rate;
	
	this.onLoad = opt.onLoad;
	this.onStart = opt.onStart;
	this.onMove = opt.onMove;
	this.onEnd = opt.onEnd;
	
	var oThis = this, END = function(){ oThis._end(); };
	this._END = function(){ oThis._timer = setTimeout( END, oThis.delay ); };
	this._START = $$F.bindAsEventListener( this._start, this );
	this._MOVE = $$F.bindAsEventListener( this._move, this );
	this._MOUSE = $$F.bindAsEventListener( this._mouse, this );
	this._OUT = $$F.bindAsEventListener( function(e){
			if ( !e.relatedTarget ) this._END();
		}, this );
	
	$$CE.fireEvent( this, "init" );
  },
  //设置默认属性
  _setOptions: function(options) {
    this.options = {//默认值
		scale:		0,//比例(大图/原图)
		max:		10,//最大比例
		min:		1.5,//最小比例
		originPic:	"",//原图地址
		zoomPic:	"",//大图地址
		rangeWidth:	0,//显示范围宽度
		rangeHeight:0,//显示范围高度
		delay:		20,//延迟结束时间
		autoHide:	true,//是否自动隐藏
		mouse:		false,//鼠标缩放
		rate:		.2,//鼠标缩放比率
		onLoad:		$$.emptyFunction,//加载完成时执行
		onStart:	$$.emptyFunction,//开始放大时执行
		onMove:		$$.emptyFunction,//放大移动时执行
		onEnd:		$$.emptyFunction//放大结束时执行
    };
    return $$.extend(this.options, options || {});
  },
  //初始化加载
  _initLoad: function() {
	var image = this._image, originPic = this._originPic,
		useOrigin = !this._zoomPic && this._scale,
		loadImage = $$F.bind( useOrigin ? this._loadOriginImage : this._loadImage, this );
	//设置自动隐藏
	this.autoHide && this._hide();
	//先加载原图
	if ( originPic && originPic != image.src ) {//使用自定义地址
		image.onload = loadImage;
		image.src = originPic;
	} else if ( image.src ) {//使用元素地址
		if ( !image.complete ) {//未载入完
			image.onload = loadImage;
		} else {//已经载入
			loadImage();
		}
	} else {
		return;//没有原图地址
	}
	//加载大图
	if ( !useOrigin ) {
		var preload = this._preload, zoomPic = this._zoomPic || image.src,
			loadPreload = $$F.bind( this._loadPreload, this );
		if ( zoomPic != preload.src ) {//新地址重新加载
			preload.onload = loadPreload;
			preload.src = zoomPic;
		} else {//正在加载
			if ( !preload.complete ) {//未载入完
				preload.onload = loadPreload;
			} else {//已经载入
				this._loadPreload();
			}
		}
	}
  },
  //原图放大加载程序
  _loadOriginImage: function() {
	this._image.onload = null;
	this._zoom.src = this._image.src;
	this._initLoaded();
  },
  //原图加载程序
  _loadImage: function() {
	this._image.onload = null;
	if ( this._loaded ) {//大图已经加载
		this._initLoaded();
	} else {
		this._loaded = true;
		if ( this._scale ) {//有自定义比例才用原图放大替换大图
			this._substitute = true;
			this._zoom.src = this._image.src;
			this._initLoaded();
		}
	}
  },
  //大图预载程序
  _loadPreload: function() {
	this._preload.onload = null;
	this._zoom.src = this._preload.src;
	if ( this._loaded ) {//原图已经加载
		//没有使用替换
		if ( !this._substitute ) { this._initLoaded(); }
	} else {
		this._loaded = true;
	}
  },
  //初始化加载设置
  _initLoaded: function(src) {
	//初始化显示图
	this._initSize();
	//初始化显示框
	this._initViewer();
	//初始化数据
	this._initData();
	//开始执行
	$$CE.fireEvent( this, "load" );
	this.onLoad();
	this.start();
  },
  //初始化显示图尺寸
  _initSize: function() {
	var zoom = this._zoom, image = this._image, scale = this._scale;
	if ( !scale ) { scale = this._preload.width / image.width; }
	this._scale = scale = Math.min( Math.max( this._min, scale ), this._max );
	//按比例设置显示图大小
	zoom.width = Math.ceil( image.width * scale );
	zoom.height = Math.ceil( image.height * scale );
  },
  //初始化显示框
  _initViewer: function() {
	var zoom = this._zoom, viewer = this._viewer;
	//设置样式
	var styles = { padding: 0, overflow: "hidden" }, p = $$D.getStyle( viewer, "position" );
	if ( p != "relative" && p != "absolute" ){ styles.position = "relative"; };
	$$D.setStyle( viewer, styles );
	zoom.style.position = "absolute";
	//插入显示图
	if ( !$$D.contains( viewer, zoom ) ){ viewer.appendChild( zoom ); }
  },
  //初始化数据
  _initData: function() {
	var zoom = this._zoom, image = this._image, viewer = this._viewer,
		scale = this._scale, rangeWidth = this._rangeWidth, rangeHeight = this._rangeHeight;
	//原图坐标
	this._rect = $$D.rect( image );
	//修正参数
	this._repairLeft = image.clientLeft + parseInt($$D.getStyle( image, "padding-left" ));
	this._repairTop = image.clientTop + parseInt($$D.getStyle( image, "padding-top" ));
	//设置范围参数和显示框大小
	if ( rangeWidth > 0 && rangeHeight > 0 ) {
		rangeWidth = Math.ceil( rangeWidth );
		rangeHeight = Math.ceil( rangeHeight );
		this._viewerWidth = Math.ceil( rangeWidth * scale );
		this._viewerHeight = Math.ceil( rangeHeight * scale );
		$$D.setStyle( viewer, {
			width: this._viewerWidth + "px",
			height: this._viewerHeight + "px"
		});
	} else {
		var styles;
		if ( !viewer.clientWidth ) {//隐藏
			var style = viewer.style;
			styles = {
				display: style.display,
				position: style.position,
				visibility: style.visibility
			};
			$$D.setStyle( viewer, {
				display: "block", position: "absolute", visibility: "hidden"
			});
		}
		this._viewerWidth = viewer.clientWidth;
		this._viewerHeight = viewer.clientHeight;
		if ( styles ) { $$D.setStyle( viewer, styles ); }
		
		rangeWidth = Math.ceil( this._viewerWidth / scale );
		rangeHeight = Math.ceil( this._viewerHeight / scale );
	}
	this._rangeWidth = rangeWidth;
	this._rangeHeight = rangeHeight;
  },
  //开始
  _start: function() {
	clearTimeout( this._timer );
	var viewer = this._viewer, image = this._image, scale = this._scale;
	viewer.style.display = "block";
	$$CE.fireEvent( this, "start" );
	this.onStart();
	$$E.removeEvent( image, "mouseover", this._START );
	$$E.removeEvent( image, "mousemove", this._START );
	$$E.addEvent( document, "mousemove", this._MOVE );
	$$E.addEvent( document, "mouseout", this._OUT );
	this.mouse && $$E.addEvent( document, $$B.firefox ? "DOMMouseScroll" : "mousewheel", this._MOUSE );
  },
  //移动
  _move: function(e) {
	clearTimeout( this._timer );
	var x = e.pageX, y = e.pageY, rect = this._rect;
	if ( x < rect.left || x > rect.right || y < rect.top || y > rect.bottom ) {
		this._END();//移出原图范围
	} else {
		var pos = {}, scale = this._scale, zoom = this._zoom,
			viewerWidth = this._viewerWidth,
			viewerHeight = this._viewerHeight;
		//修正坐标
		pos.left = viewerWidth / 2 - ( x - rect.left - this._repairLeft ) * scale;
		pos.top = viewerHeight / 2 - ( y - rect.top - this._repairTop ) * scale;
		
		$$CE.fireEvent( this, "repair", e, pos );
		//范围限制
		x = Math.ceil(Math.min(Math.max( pos.left, viewerWidth - zoom.width ), 0));
		y = Math.ceil(Math.min(Math.max( pos.top, viewerHeight - zoom.height ), 0));
		//设置定位
		zoom.style.left = x + "px";
		zoom.style.top = y + "px";
		
		$$CE.fireEvent( this, "move", e, x, y );
		this.onMove();
	}
  },
  //结束
  _end: function() {
	$$CE.fireEvent( this, "end" );
	this.onEnd();
	this.autoHide && this._hide();
	this.stop();
	this.start();
  },
  //隐藏
  _hide: function() {
	this._viewer.style.display = "none";
  },
  //鼠标缩放
  _mouse: function(e) {
	this._scale += ( e.wheelDelta ? e.wheelDelta / (-120) : (e.detail || 0) / 3 ) * this.rate;
	
	var opt = this.options;
	this._rangeWidth = opt.rangeWidth;
	this._rangeHeight = opt.rangeHeight;
	
	this._initSize();
	this._initData();
	this._move(e);
	e.preventDefault();
  },
  //开始
  start: function() {
	if ( this._viewerWidth && this._viewerHeight ) {
		var image = this._image, START = this._START;
		$$E.addEvent( image, "mouseover", START );
		$$E.addEvent( image, "mousemove", START );
	}
  },
  //停止
  stop: function() {
	clearTimeout( this._timer );
	$$E.removeEvent( this._image, "mouseover", this._START );
	$$E.removeEvent( this._image, "mousemove", this._START );
	$$E.removeEvent( document, "mousemove", this._MOVE );
	$$E.removeEvent( document, "mouseout", this._OUT );
	$$E.removeEvent( document, $$B.firefox ? "DOMMouseScroll" : "mousewheel", this._MOUSE );
  },
  //修改设置
  reset: function(options) {
	this.stop();
	
	var viewer = this._viewer, zoom = this._zoom;
	if ( $$D.contains( viewer, zoom ) ) { viewer.removeChild( zoom ); }
	
	var opt = $$.extend( this.options, options || {} );
	this._scale = opt.scale;
	this._max = opt.max;
	this._min = opt.min;
	this._originPic = opt.originPic;
	this._zoomPic = opt.zoomPic;
	this._rangeWidth = opt.rangeWidth;
	this._rangeHeight = opt.rangeHeight;
	
	//重置属性
	this._loaded = this._substitute = false;
	this._rect = null;
	this._repairLeft = this._repairTop = 
	this._viewerWidth = this._viewerHeight = 0;
	
	this._initLoad();
  },
  //销毁程序
  dispose: function() {
	$$CE.fireEvent( this, "dispose" );
	this.stop();
	if ( $$D.contains( this._viewer, this._zoom ) ) {
		this._viewer.removeChild( this._zoom );
	}
	this._image.onload = this._preload.onload =
		this._image = this._preload = this._zoom = this._viewer =
		this.onLoad = this.onStart = this.onMove = this.onEnd =
		this._START = this._MOVE = this._END = this._OUT = null
  }
}

ImageZoom._MODE = {
	//跟随
	"follow": {
		methods: {
			init: function() {
				this._stylesFollow = null;//备份样式
				this._repairFollowLeft = 0;//修正坐标left
				this._repairFollowTop = 0;//修正坐标top
			},
			load: function() {
				var viewer = this._viewer, style = viewer.style, styles;
				this._stylesFollow = {
					left: style.left, top: style.top, position: style.position
				};
				viewer.style.position = "absolute";
				//获取修正参数
				if ( !viewer.offsetWidth ) {//隐藏
					styles = { display: style.display, visibility: style.visibility };
					$$D.setStyle( viewer, { display: "block", visibility: "hidden" });
				}
				//修正中心位置
				this._repairFollowLeft = viewer.offsetWidth / 2;
				this._repairFollowTop = viewer.offsetHeight / 2;
				//修正offsetParent位置
				if ( !/BODY|HTML/.test( viewer.offsetParent.nodeName ) ) {
					var parent = viewer.offsetParent, rect = $$D.rect( parent );
					this._repairFollowLeft += rect.left + parent.clientLeft;
					this._repairFollowTop += rect.top + parent.clientTop;
				}
				if ( styles ) { $$D.setStyle( viewer, styles ); }
			},
			repair: function(e, pos) {
				var zoom = this._zoom,
					viewerWidth = this._viewerWidth,
					viewerHeight = this._viewerHeight;
				pos.left = ( viewerWidth / 2 - pos.left ) * ( viewerWidth / zoom.width - 1 );
				pos.top = ( viewerHeight / 2 - pos.top ) * ( viewerHeight / zoom.height - 1 );
			},
			move: function(e) {
				var style = this._viewer.style;
				style.left = e.pageX - this._repairFollowLeft + "px";
				style.top = e.pageY - this._repairFollowTop + "px";
			},
			dispose: function() {
				$$D.setStyle( this._viewer, this._stylesFollow );
			}
		}
	},
	//拖柄
	"handle": {
		options: {//默认值
			handle:		""//拖柄对象
    	},
		methods: {
			init: function() {
				var handle = $$( this.options.handle );
				if ( !handle ) {//没有定义的话用复制显示框代替
					var body = document.body;
					handle = body.insertBefore(this._viewer.cloneNode(false), body.childNodes[0]);
					handle.id = "";
					handle["_createbyhandle"] = true;//生成标识用于移除
				} else {
					var style = handle.style;
					this._stylesHandle = {
						left: style.left, top: style.top, position: style.position,
						display: style.display, visibility: style.visibility,
						padding: style.padding, margin: style.margin,
						width: style.width, height: style.height
					};
				}
				$$D.setStyle( handle, { padding: 0, margin: 0, display: "none" } );
				
				this._handle = handle;
				this._repairHandleLeft = 0;//修正坐标left
				this._repairHandleTop = 0;//修正坐标top
			},
			load: function() {
				var handle = this._handle, rect = this._rect;
				$$D.setStyle( handle, {
					position: "absolute",
					width: this._rangeWidth + "px",
					height: this._rangeHeight + "px",
					display: "block",
					visibility: "hidden"
				});
				//获取修正参数
				this._repairHandleLeft = rect.left + this._repairLeft - handle.clientLeft;
				this._repairHandleTop = rect.top + this._repairTop - handle.clientTop;
				//修正offsetParent位置
				if ( !/BODY|HTML/.test( handle.offsetParent.nodeName ) ) {
					var parent = handle.offsetParent, rect = $$D.rect( parent );
					this._repairHandleLeft -= rect.left + parent.clientLeft;
					this._repairHandleTop -= rect.top + parent.clientTop;
				}
				//隐藏
				$$D.setStyle( handle, { display: "none", visibility: "visible" });
			},
			start: function() {
				this._handle.style.display = "block";
			},
			move: function(e, x, y) {
				var style = this._handle.style, scale = this._scale;
				style.left = Math.ceil( this._repairHandleLeft - x / scale ) + "px";
				style.top = Math.ceil( this._repairHandleTop - y / scale )  + "px";
			},
			end: function() {
				this._handle.style.display = "none";
			},
			dispose: function() {
				if( "_createbyhandle" in this._handle ){
					document.body.removeChild( this._handle );
				} else {
					$$D.setStyle( this._handle, this._stylesHandle );
				}
				this._handle = null;
			}
		}
	},
	//切割
	"cropper": {
		options: {//默认值
			opacity:	.5//透明度
    	},
		methods: {
			init: function() {
				var body = document.body,
					cropper = body.insertBefore(document.createElement("img"), body.childNodes[0]);
				cropper.style.display = "none";
				
				this._cropper = cropper;
				this.opacity = this.options.opacity;
			},
			load: function() {
				var cropper = this._cropper, image = this._image, rect = this._rect;
				cropper.src = image.src;
				cropper.width = image.width;
				cropper.height = image.height;
				$$D.setStyle( cropper, {
					position: "absolute",
					left: rect.left + this._repairLeft + "px",
					top: rect.top + this._repairTop + "px"
				});
			},
			start: function() {
				this._cropper.style.display = "block";
				$$D.setStyle( this._image, "opacity", this.opacity );
			},
			move: function(e, x, y) {
				var w = this._rangeWidth, h = this._rangeHeight, scale = this._scale;
				x = Math.ceil( -x / scale ); y = Math.ceil( -y / scale );
				this._cropper.style.clip = "rect(" + y + "px " + (x + w) + "px " + (y + h) + "px " + x + "px)";
			},
			end: function() {
				$$D.setStyle( this._image, "opacity", 1 );
				this._cropper.style.display = "none";
			},
			dispose: function() {
				$$D.setStyle( this._image, "opacity", 1 );
				document.body.removeChild( this._cropper );
				this._cropper = null;
			}
		}
	}
}

ImageZoom.prototype._initialize = (function(){
	var init = ImageZoom.prototype._initialize,
		mode = ImageZoom._MODE,
		modes = {
			"follow": [ mode.follow ],
			"handle": [ mode.handle ],
			"cropper": [ mode.cropper ],
			"handle-cropper": [ mode.handle, mode.cropper ]
		};
	return function(){
		var options = arguments[2];
		if ( options && options.mode && modes[ options.mode ] ) {
			$$A.forEach( modes[ options.mode ], function( mode ){
				//扩展options
				$$.extend( options, mode.options, false );
				//扩展钩子
				$$A.forEach( mode.methods, function( method, name ){
					$$CE.addEvent( this, name, method );
				}, this );
			}, this );
		}
		init.apply( this, arguments );
	}
})();
