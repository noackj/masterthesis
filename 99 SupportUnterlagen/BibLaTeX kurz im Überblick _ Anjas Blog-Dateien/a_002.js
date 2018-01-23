/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
/* global pm, wpcom_reblog */

var jetpackLikesWidgetQueue = [];
var jetpackLikesWidgetBatch = [];
var jetpackLikesMasterReady = false;

function JetpackLikespostMessage( message, target ) {
	if ( 'string' === typeof message ){
		try {
			message = JSON.parse( message );
		} catch(e) {
			return;
		}
	}

	pm( {
		target: target,
		type: 'likesMessage',
		data: message,
		origin: '*'
	} );
}

function JetpackLikesBatchHandler() {
	var requests = [];
	jQuery( 'div.jetpack-likes-widget-unloaded' ).each( function() {
		if ( jetpackLikesWidgetBatch.indexOf( this.id ) > -1 ) {
			return;
		}
		jetpackLikesWidgetBatch.push( this.id );
		var regex = /like-(post|comment)-wrapper-(\d+)-(\d+)-(\w+)/,
			match = regex.exec( this.id ),
			info;

		if ( ! match || match.length !== 5 ) {
			return;
		}

		info = {
			blog_id: match[2],
			width:   this.width
		};

		if ( 'post' === match[1] ) {
			info.post_id = match[3];
		} else if ( 'comment' === match[1] ) {
			info.comment_id = match[3];
		}

		info.obj_id = match[4];

		requests.push( info );
	});

	if ( requests.length > 0 ) {
		JetpackLikespostMessage( { event: 'initialBatch', requests: requests }, window.frames['likes-master'] );
	}
}

function JetpackLikesMessageListener( event, message ) {
	var allowedOrigin, $container, $list, offset, rowLength, height, scrollbarWidth;

	if ( 'undefined' === typeof event.event ) {
		return;
	}

	// We only allow messages from one origin
	allowedOrigin = window.location.protocol + '//widgets.wp.com';
	if ( allowedOrigin !== message.origin ) {
		return;
	}

	if ( 'masterReady' === event.event ) {
		jQuery( document ).ready( function() {
			jetpackLikesMasterReady = true;

			var stylesData = {
					event: 'injectStyles'
				},
				$sdTextColor = jQuery( '.sd-text-color' ),
				$sdLinkColor = jQuery( '.sd-link-color' );

			if ( jQuery( 'iframe.admin-bar-likes-widget' ).length > 0 ) {
				JetpackLikespostMessage( { event: 'adminBarEnabled' }, window.frames[ 'likes-master' ] );

				stylesData.adminBarStyles = {
					background: jQuery( '#wpadminbar .quicklinks li#wp-admin-bar-wpl-like > a' ).css( 'background' ),
					isRtl: ( 'rtl' === jQuery( '#wpadminbar' ).css( 'direction' ) )
				};
			}

			if ( ! window.addEventListener ) {
				jQuery( '#wp-admin-bar-admin-bar-likes-widget' ).hide();
			}

			stylesData.textStyles = {
				color:          $sdTextColor.css( 'color' ),
				fontFamily:     $sdTextColor.css( 'font-family' ),
				fontSize:       $sdTextColor.css( 'font-size' ),
				direction:      $sdTextColor.css( 'direction' ),
				fontWeight:     $sdTextColor.css( 'font-weight' ),
				fontStyle:      $sdTextColor.css( 'font-style' ),
				textDecoration: $sdTextColor.css('text-decoration')
			};

			stylesData.linkStyles = {
				color:          $sdLinkColor.css('color'),
				fontFamily:     $sdLinkColor.css('font-family'),
				fontSize:       $sdLinkColor.css('font-size'),
				textDecoration: $sdLinkColor.css('text-decoration'),
				fontWeight:     $sdLinkColor.css( 'font-weight' ),
				fontStyle:      $sdLinkColor.css( 'font-style' )
			};

			JetpackLikespostMessage( stylesData, window.frames[ 'likes-master' ] );

			JetpackLikesBatchHandler();

			jQuery( document ).on( 'inview', 'div.jetpack-likes-widget-unloaded', function() {
				jetpackLikesWidgetQueue.push( this.id );
			});
		});
	}

	if ( 'showLikeWidget' === event.event ) {
		jQuery( '#' + event.id + ' .post-likes-widget-placeholder'  ).fadeOut( 'fast', function() {
			jQuery( '#' + event.id + ' .post-likes-widget' ).fadeIn( 'fast', function() {
				JetpackLikespostMessage( { event: 'likeWidgetDisplayed', blog_id: event.blog_id, post_id: event.post_id, obj_id: event.obj_id }, window.frames['likes-master'] );
			});
		});
	}

	if ( 'clickReblogFlair' === event.event ) {
		wpcom_reblog.toggle_reblog_box_flair( event.obj_id );
	}

	if ( 'showOtherGravatars' === event.event ) {
		$container = jQuery( '#likes-other-gravatars' );
		$list = $container.find( 'ul' );

		$container.hide();
		$list.html( '' );

		$container.find( '.likes-text span' ).text( event.total );

		jQuery.each( event.likers, function( i, liker ) {
			var element = jQuery( '<li><a><img /></a></li>' );
			element.addClass( liker.css_class );

			element.find( 'a' ).
				attr({
					href: liker.profile_URL,
					rel: 'nofollow',
					target: '_parent'
				}).
				addClass( 'wpl-liker' );

			element.find( 'img' ).
				attr({
					src: liker.avatar_URL,
					alt: liker.name
				}).
				css({
					width: '30px',
					height: '30px',
					paddingRight: '3px'
				});

			$list.append( element );
		} );

		offset = jQuery( '[name=\'' + event.parent + '\']' ).offset();

		$container.css( 'left', offset.left + event.position.left - 10 + 'px' );
		$container.css( 'top', offset.top + event.position.top - 33 + 'px' );

		rowLength = Math.floor( event.width / 37 );
		height = ( Math.ceil( event.likers.length / rowLength ) * 37 ) + 13;
		if ( height > 204 ) {
			height = 204;
		}

		$container.css( 'height', height + 'px' );
		$container.css( 'width', rowLength * 37 - 7 + 'px' );

		$list.css( 'width', rowLength * 37 + 'px' );

		$container.fadeIn( 'slow' );

		scrollbarWidth = $list[0].offsetWidth - $list[0].clientWidth;
		if ( scrollbarWidth > 0 ) {
			$container.width( $container.width() + scrollbarWidth );
			$list.width( $list.width() + scrollbarWidth );
		}
	}
}

pm.bind( 'likesMessage', JetpackLikesMessageListener );

jQuery( document ).click( function( e ) {
	var $container = jQuery( '#likes-other-gravatars' );

	if ( $container.has( e.target ).length === 0 ) {
		$container.fadeOut( 'slow' );
	}
});

function JetpackLikesWidgetQueueHandler() {
	var $wrapper, wrapperID, found;
	if ( ! jetpackLikesMasterReady ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	if ( jetpackLikesWidgetQueue.length > 0 ) {
		// We may have a widget that needs creating now
		found = false;
		while( jetpackLikesWidgetQueue.length > 0 ) {
			// Grab the first member of the queue that isn't already loading.
			wrapperID = jetpackLikesWidgetQueue.splice( 0, 1 )[0];
			if ( jQuery( '#' + wrapperID ).hasClass( 'jetpack-likes-widget-unloaded' ) ) {
				found = true;
				break;
			}
		}
		if ( ! found ) {
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	} else if ( jQuery( 'div.jetpack-likes-widget-unloaded' ).length > 0 ) {
		// Grab any unloaded widgets for a batch request
		JetpackLikesBatchHandler();

		// Get the next unloaded widget
		wrapperID = jQuery( 'div.jetpack-likes-widget-unloaded' ).first()[0].id;
		if ( ! wrapperID ) {
			// Everything is currently loaded
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	}

	if ( 'undefined' === typeof wrapperID ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	$wrapper = jQuery( '#' + wrapperID );
	$wrapper.find( 'iframe' ).remove();

	if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="22px" width="68px" frameBorder="0" scrolling="no" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	} else {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="55px" width="100%" frameBorder="0" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	}

	$wrapper.removeClass( 'jetpack-likes-widget-unloaded' ).addClass( 'jetpack-likes-widget-loading' );

	$wrapper.find( 'iframe' ).load( function( e ) {
		var $iframe = jQuery( e.target );
		$wrapper.removeClass( 'jetpack-likes-widget-loading' ).addClass( 'jetpack-likes-widget-loaded' );

		JetpackLikespostMessage( { event: 'loadLikeWidget', name: $iframe.attr( 'name' ), width: $iframe.width() }, window.frames[ 'likes-master' ] );

		if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
			$wrapper.find( 'iframe' ).Jetpack( 'resizeable' );
		}
	});
	setTimeout( JetpackLikesWidgetQueueHandler, 250 );
}
JetpackLikesWidgetQueueHandler();
;
var addComment={moveForm:function(a,b,c,d){var e,f,g,h,i=this,j=i.I(a),k=i.I(c),l=i.I("cancel-comment-reply-link"),m=i.I("comment_parent"),n=i.I("comment_post_ID"),o=k.getElementsByTagName("form")[0];if(j&&k&&l&&m&&o){i.respondId=c,d=d||!1,i.I("wp-temp-form-div")||(e=document.createElement("div"),e.id="wp-temp-form-div",e.style.display="none",k.parentNode.insertBefore(e,k)),j.parentNode.insertBefore(k,j.nextSibling),n&&d&&(n.value=d),m.value=b,l.style.display="",l.onclick=function(){var a=addComment,b=a.I("wp-temp-form-div"),c=a.I(a.respondId);if(b&&c)return a.I("comment_parent").value="0",b.parentNode.insertBefore(c,b),b.parentNode.removeChild(b),this.style.display="none",this.onclick=null,!1};try{for(var p=0;p<o.elements.length;p++)if(f=o.elements[p],h=!1,"getComputedStyle"in window?g=window.getComputedStyle(f):document.documentElement.currentStyle&&(g=f.currentStyle),(f.offsetWidth<=0&&f.offsetHeight<=0||"hidden"===g.visibility)&&(h=!0),"hidden"!==f.type&&!f.disabled&&!h){f.focus();break}}catch(q){}return!1}},I:function(a){return document.getElementById(a)}};;
/**
 * Handles toggling the main navigation menu for small screens.
 */
jQuery( document ).ready( function( $ ) {
	var $masthead = $( '#masthead' ),
	    timeout = false;

	$.fn.smallMenu = function() {
		$masthead.find( '.site-navigation' ).removeClass( 'main-navigation' ).addClass( 'main-small-navigation' );
		$masthead.find( '.site-navigation h1' ).removeClass( 'assistive-text' ).addClass( 'menu-toggle' );

		$( '.menu-toggle' ).unbind( 'click' ).click( function() {
			$masthead.find( '.menu' ).toggle();
			$( this ).toggleClass( 'toggled-on' );
		} );
	};

	// Check viewport width on first load.
	if ( $( window ).width() < 600 )
		$.fn.smallMenu();

	// Check viewport width when user resizes the browser window.
	$( window ).resize( function() {
		var browserWidth = $( window ).width();

		if ( false !== timeout )
			clearTimeout( timeout );

		timeout = setTimeout( function() {
			if ( browserWidth < 600 ) {
				$.fn.smallMenu();
			} else {
				$masthead.find( '.site-navigation' ).removeClass( 'main-small-navigation' ).addClass( 'main-navigation' );
				$masthead.find( '.site-navigation h1' ).removeClass( 'menu-toggle' ).addClass( 'assistive-text' );
				$masthead.find( '.menu' ).removeAttr( 'style' );
			}
		}, 200 );
	} );

	var container = $( '.site-navigation' );

	// Fix child menus for touch devices.
	function fixMenuTouchTaps( container ) {
		var touchStartFn,
		    parentLink = container.find( '.menu-item-has-children > a, .page_item_has_children > a' );

		if ( 'ontouchstart' in window ) {
			touchStartFn = function( e ) {
				var menuItem = this.parentNode;

				if ( ! menuItem.classList.contains( 'focus' ) ) {
					e.preventDefault();
					for( var i = 0; i < menuItem.parentNode.children.length; ++i ) {
						if ( menuItem === menuItem.parentNode.children[i] ) {
							continue;
						}
						menuItem.parentNode.children[i].classList.remove( 'focus' );
					}
					menuItem.classList.add( 'focus' );
				} else {
					menuItem.classList.remove( 'focus' );
				}
			};

			for ( var i = 0; i < parentLink.length; ++i ) {
				parentLink[i].addEventListener( 'touchstart', touchStartFn, false )
			}
		}
	}

	fixMenuTouchTaps( container );
} );;
/*
 * jQuery FlexSlider v2.1
 * http://www.woothemes.com/flexslider/
 *
 * Copyright 2012 WooThemes
 * Free to use under the GPLv2 license.
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 * Contributing author: Tyler Smith (@mbmufffin)
 */

;(function ($) {

  //FlexSlider: Object Instance
  $.flexslider = function(el, options) {
    var slider = $(el),
        vars = $.extend({}, $.flexslider.defaults, options),
        namespace = vars.namespace,
        touch = ("ontouchstart" in window) || window.DocumentTouch && document instanceof DocumentTouch,
        eventType = (touch) ? "touchend" : "click",
        vertical = vars.direction === "vertical",
        reverse = vars.reverse,
        carousel = (vars.itemWidth > 0),
        fade = vars.animation === "fade",
        asNav = vars.asNavFor !== "",
        methods = {};

    // Store a reference to the slider object
    $.data(el, "flexslider", slider);

    // Privat slider methods
    methods = {
      init: function() {
        slider.animating = false;
        slider.currentSlide = vars.startAt;
        slider.animatingTo = slider.currentSlide;
        slider.atEnd = (slider.currentSlide === 0 || slider.currentSlide === slider.last);
        slider.containerSelector = vars.selector.substr(0,vars.selector.search(' '));
        slider.slides = $(vars.selector, slider);
        slider.container = $(slider.containerSelector, slider);
        slider.count = slider.slides.length;
        // SYNC:
        slider.syncExists = $(vars.sync).length > 0;
        // SLIDE:
        if (vars.animation === "slide") vars.animation = "swing";
        slider.prop = (vertical) ? "top" : "marginLeft";
        slider.args = {};
        // SLIDESHOW:
        slider.manualPause = false;
        // TOUCH/USECSS:
        slider.transitions = !vars.video && !fade && vars.useCSS && (function() {
          var obj = document.createElement('div'),
              props = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
          for (var i in props) {
            if ( obj.style[ props[i] ] !== undefined ) {
              slider.pfx = props[i].replace('Perspective','').toLowerCase();
              slider.prop = "-" + slider.pfx + "-transform";
              return true;
            }
          }
          return false;
        }());
        // CONTROLSCONTAINER:
        if (vars.controlsContainer !== "") slider.controlsContainer = $(vars.controlsContainer).length > 0 && $(vars.controlsContainer);
        // MANUAL:
        if (vars.manualControls !== "") slider.manualControls = $(vars.manualControls).length > 0 && $(vars.manualControls);

        // RANDOMIZE:
        if (vars.randomize) {
          slider.slides.sort(function() { return (Math.round(Math.random())-0.5); });
          slider.container.empty().append(slider.slides);
        }

        slider.doMath();

        // ASNAV:
        if (asNav) methods.asNav.setup();

        // INIT
        slider.setup("init");

        // CONTROLNAV:
        if (vars.controlNav) methods.controlNav.setup();

        // DIRECTIONNAV:
        if (vars.directionNav) methods.directionNav.setup();

        // KEYBOARD:
        if (vars.keyboard && ($(slider.containerSelector).length === 1 || vars.multipleKeyboard)) {
          $(document).bind('keyup', function(event) {
            var keycode = event.keyCode;
            if (!slider.animating && (keycode === 39 || keycode === 37)) {
              var target = (keycode === 39) ? slider.getTarget('next') :
                           (keycode === 37) ? slider.getTarget('prev') : false;
              slider.flexAnimate(target, vars.pauseOnAction);
            }
          });
        }
        // MOUSEWHEEL:
        if (vars.mousewheel) {
          slider.bind('mousewheel', function(event, delta, deltaX, deltaY) {
            event.preventDefault();
            var target = (delta < 0) ? slider.getTarget('next') : slider.getTarget('prev');
            slider.flexAnimate(target, vars.pauseOnAction);
          });
        }

        // PAUSEPLAY
        if (vars.pausePlay) methods.pausePlay.setup();

        // SLIDSESHOW
        if (vars.slideshow) {
          if (vars.pauseOnHover) {
            slider.hover(function() {
              if (!slider.manualPlay && !slider.manualPause) slider.pause();
            }, function() {
              if (!slider.manualPause && !slider.manualPlay) slider.play();
            });
          }
          // initialize animation
          (vars.initDelay > 0) ? setTimeout(slider.play, vars.initDelay) : slider.play();
        }

        // TOUCH
        if (touch && vars.touch) methods.touch();

        // FADE&&SMOOTHHEIGHT || SLIDE:
        if (!fade || (fade && vars.smoothHeight)) $(window).bind("resize focus", methods.resize);


        // API: start() Callback
        setTimeout(function(){
          vars.start(slider);
        }, 200);
      },
      asNav: {
        setup: function() {
          slider.asNav = true;
          slider.animatingTo = Math.floor(slider.currentSlide/slider.move);
          slider.currentItem = slider.currentSlide;
          slider.slides.removeClass(namespace + "active-slide").eq(slider.currentItem).addClass(namespace + "active-slide");
          slider.slides.click(function(e){
            e.preventDefault();
            var $slide = $(this),
                target = $slide.index();
            if (!$(vars.asNavFor).data('flexslider').animating && !$slide.hasClass('active')) {
              slider.direction = (slider.currentItem < target) ? "next" : "prev";
              slider.flexAnimate(target, vars.pauseOnAction, false, true, true);
            }
          });
        }
      },
      controlNav: {
        setup: function() {
          if (!slider.manualControls) {
            methods.controlNav.setupPaging();
          } else { // MANUALCONTROLS:
            methods.controlNav.setupManual();
          }
        },
        setupPaging: function() {
          var type = (vars.controlNav === "thumbnails") ? 'control-thumbs' : 'control-paging',
              j = 1,
              item;

          slider.controlNavScaffold = $('<ol class="'+ namespace + 'control-nav ' + namespace + type + '"></ol>');

          if (slider.pagingCount > 1) {
            for (var i = 0; i < slider.pagingCount; i++) {
              item = (vars.controlNav === "thumbnails") ? '<img src="' + slider.slides.eq(i).attr("data-thumb") + '"/>' : '<a>' + j + '</a>';
              slider.controlNavScaffold.append('<li>' + item + '</li>');
              j++;
            }
          }

          // CONTROLSCONTAINER:
          (slider.controlsContainer) ? $(slider.controlsContainer).append(slider.controlNavScaffold) : slider.append(slider.controlNavScaffold);
          methods.controlNav.set();

          methods.controlNav.active();

          slider.controlNavScaffold.delegate('a, img', eventType, function(event) {
            event.preventDefault();
            var $this = $(this),
                target = slider.controlNav.index($this);

            if (!$this.hasClass(namespace + 'active')) {
              slider.direction = (target > slider.currentSlide) ? "next" : "prev";
              slider.flexAnimate(target, vars.pauseOnAction);
            }
          });
          // Prevent iOS click event bug
          if (touch) {
            slider.controlNavScaffold.delegate('a', "click touchstart", function(event) {
              event.preventDefault();
            });
          }
        },
        setupManual: function() {
          slider.controlNav = slider.manualControls;
          methods.controlNav.active();

          slider.controlNav.live(eventType, function(event) {
            event.preventDefault();
            var $this = $(this),
                target = slider.controlNav.index($this);

            if (!$this.hasClass(namespace + 'active')) {
              (target > slider.currentSlide) ? slider.direction = "next" : slider.direction = "prev";
              slider.flexAnimate(target, vars.pauseOnAction);
            }
          });
          // Prevent iOS click event bug
          if (touch) {
            slider.controlNav.live("click touchstart", function(event) {
              event.preventDefault();
            });
          }
        },
        set: function() {
          var selector = (vars.controlNav === "thumbnails") ? 'img' : 'a';
          slider.controlNav = $('.' + namespace + 'control-nav li ' + selector, (slider.controlsContainer) ? slider.controlsContainer : slider);
        },
        active: function() {
          slider.controlNav.removeClass(namespace + "active").eq(slider.animatingTo).addClass(namespace + "active");
        },
        update: function(action, pos) {
          if (slider.pagingCount > 1 && action === "add") {
            slider.controlNavScaffold.append($('<li><a>' + slider.count + '</a></li>'));
          } else if (slider.pagingCount === 1) {
            slider.controlNavScaffold.find('li').remove();
          } else {
            slider.controlNav.eq(pos).closest('li').remove();
          }
          methods.controlNav.set();
          (slider.pagingCount > 1 && slider.pagingCount !== slider.controlNav.length) ? slider.update(pos, action) : methods.controlNav.active();
        }
      },
      directionNav: {
        setup: function() {
          var directionNavScaffold = $('<ul class="' + namespace + 'direction-nav"><li><a class="' + namespace + 'prev" href="#">' + vars.prevText + '</a></li><li><a class="' + namespace + 'next" href="#">' + vars.nextText + '</a></li></ul>');

          // CONTROLSCONTAINER:
          if (slider.controlsContainer) {
            $(slider.controlsContainer).append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider.controlsContainer);
          } else {
            slider.append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider);
          }

          methods.directionNav.update();

          slider.directionNav.bind(eventType, function(event) {
            event.preventDefault();
            var target = ($(this).hasClass(namespace + 'next')) ? slider.getTarget('next') : slider.getTarget('prev');
            slider.flexAnimate(target, vars.pauseOnAction);
          });
          // Prevent iOS click event bug
          if (touch) {
            slider.directionNav.bind("click touchstart", function(event) {
              event.preventDefault();
            });
          }
        },
        update: function() {
          var disabledClass = namespace + 'disabled';
          if (slider.pagingCount === 1) {
            slider.directionNav.addClass(disabledClass);
          } else if (!vars.animationLoop) {
            if (slider.animatingTo === 0) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "prev").addClass(disabledClass);
            } else if (slider.animatingTo === slider.last) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "next").addClass(disabledClass);
            } else {
              slider.directionNav.removeClass(disabledClass);
            }
          } else {
            slider.directionNav.removeClass(disabledClass);
          }
        }
      },
      pausePlay: {
        setup: function() {
          var pausePlayScaffold = $('<div class="' + namespace + 'pauseplay"><a></a></div>');

          // CONTROLSCONTAINER:
          if (slider.controlsContainer) {
            slider.controlsContainer.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider.controlsContainer);
          } else {
            slider.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider);
          }

          methods.pausePlay.update((vars.slideshow) ? namespace + 'pause' : namespace + 'play');

          slider.pausePlay.bind(eventType, function(event) {
            event.preventDefault();
            if ($(this).hasClass(namespace + 'pause')) {
              slider.manualPause = true;
              slider.manualPlay = false;
              slider.pause();
            } else {
              slider.manualPause = false;
              slider.manualPlay = true;
              slider.play();
            }
          });
          // Prevent iOS click event bug
          if (touch) {
            slider.pausePlay.bind("click touchstart", function(event) {
              event.preventDefault();
            });
          }
        },
        update: function(state) {
          (state === "play") ? slider.pausePlay.removeClass(namespace + 'pause').addClass(namespace + 'play').text(vars.playText) : slider.pausePlay.removeClass(namespace + 'play').addClass(namespace + 'pause').text(vars.pauseText);
        }
      },
      touch: function() {
        var startX,
          startY,
          offset,
          cwidth,
          dx,
          startT,
          scrolling = false;

        el.addEventListener('touchstart', onTouchStart, false);
        function onTouchStart(e) {
          if (slider.animating) {
            e.preventDefault();
          } else if (e.touches.length === 1) {
            slider.pause();
            // CAROUSEL:
            cwidth = (vertical) ? slider.h : slider. w;
            startT = Number(new Date());
            // CAROUSEL:
            offset = (carousel && reverse && slider.animatingTo === slider.last) ? 0 :
                     (carousel && reverse) ? slider.limit - (((slider.itemW + vars.itemMargin) * slider.move) * slider.animatingTo) :
                     (carousel && slider.currentSlide === slider.last) ? slider.limit :
                     (carousel) ? ((slider.itemW + vars.itemMargin) * slider.move) * slider.currentSlide :
                     (reverse) ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
            startX = (vertical) ? e.touches[0].pageY : e.touches[0].pageX;
            startY = (vertical) ? e.touches[0].pageX : e.touches[0].pageY;

            el.addEventListener('touchmove', onTouchMove, false);
            el.addEventListener('touchend', onTouchEnd, false);
          }
        }

        function onTouchMove(e) {
          dx = (vertical) ? startX - e.touches[0].pageY : startX - e.touches[0].pageX;
          scrolling = (vertical) ? (Math.abs(dx) < Math.abs(e.touches[0].pageX - startY)) : (Math.abs(dx) < Math.abs(e.touches[0].pageY - startY));

          if (!scrolling || Number(new Date()) - startT > 500) {
            e.preventDefault();
            if (!fade && slider.transitions) {
              if (!vars.animationLoop) {
                dx = dx/((slider.currentSlide === 0 && dx < 0 || slider.currentSlide === slider.last && dx > 0) ? (Math.abs(dx)/cwidth+2) : 1);
              }
              slider.setProps(offset + dx, "setTouch");
            }
          }
        }

        function onTouchEnd(e) {
          if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
            var updateDx = (reverse) ? -dx : dx,
                target = (updateDx > 0) ? slider.getTarget('next') : slider.getTarget('prev');

            if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth/2)) {
              slider.flexAnimate(target, vars.pauseOnAction);
            } else {
              slider.flexAnimate(slider.currentSlide, vars.pauseOnAction, true);
            }
          }
          // finish the touch by undoing the touch session
          el.removeEventListener('touchmove', onTouchMove, false);
          el.removeEventListener('touchend', onTouchEnd, false);
          startX = null;
          startY = null;
          dx = null;
          offset = null;
        }
      },
      resize: function() {
        if (!slider.animating && slider.is(':visible')) {
          if (!carousel) slider.doMath();

          if (fade) {
            // SMOOTH HEIGHT:
            methods.smoothHeight();
          } else if (carousel) { //CAROUSEL:
            slider.slides.width(slider.computedW);
            slider.update(slider.pagingCount);
            slider.setProps();
          }
          else if (vertical) { //VERTICAL:
            slider.viewport.height(slider.h);
            slider.setProps(slider.h, "setTotal");
          } else {
            // SMOOTH HEIGHT:
            if (vars.smoothHeight) methods.smoothHeight();
            slider.newSlides.width(slider.computedW);
            slider.setProps(slider.computedW, "setTotal");
          }
        }
      },
      smoothHeight: function(dur) {
        if (!vertical || fade) {
          var $obj = (fade) ? slider : slider.viewport;
          (dur) ? $obj.animate({"height": slider.slides.eq(slider.animatingTo).height()}, dur) : $obj.height(slider.slides.eq(slider.animatingTo).height());
        }
      },
      sync: function(action) {
        var $obj = $(vars.sync).data("flexslider"),
            target = slider.animatingTo;

        switch (action) {
          case "animate": $obj.flexAnimate(target, vars.pauseOnAction, false, true); break;
          case "play": if (!$obj.playing && !$obj.asNav) { $obj.play(); } break;
          case "pause": $obj.pause(); break;
        }
      }
    }

    // public methods
    slider.flexAnimate = function(target, pause, override, withSync, fromNav) {
      if (asNav && slider.pagingCount === 1) slider.direction = (slider.currentItem < target) ? "next" : "prev";

      if (!slider.animating && (slider.canAdvance(target, fromNav) || override) && slider.is(":visible")) {
        if (asNav && withSync) {
          var master = $(vars.asNavFor).data('flexslider');
          slider.atEnd = target === 0 || target === slider.count - 1;
          master.flexAnimate(target, true, false, true, fromNav);
          slider.direction = (slider.currentItem < target) ? "next" : "prev";
          master.direction = slider.direction;

          if (Math.ceil((target + 1)/slider.visible) - 1 !== slider.currentSlide && target !== 0) {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            target = Math.floor(target/slider.visible);
          } else {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            return false;
          }
        }

        slider.animating = true;
        slider.animatingTo = target;
        // API: before() animation Callback
        vars.before(slider);

        // SLIDESHOW:
        if (pause) slider.pause();

        // SYNC:
        if (slider.syncExists && !fromNav) methods.sync("animate");

        // CONTROLNAV
        if (vars.controlNav) methods.controlNav.active();

        // !CAROUSEL:
        // CANDIDATE: slide active class (for add/remove slide)
        if (!carousel) slider.slides.removeClass(namespace + 'active-slide').eq(target).addClass(namespace + 'active-slide');

        // INFINITE LOOP:
        // CANDIDATE: atEnd
        slider.atEnd = target === 0 || target === slider.last;

        // DIRECTIONNAV:
        if (vars.directionNav) methods.directionNav.update();

        if (target === slider.last) {
          // API: end() of cycle Callback
          vars.end(slider);
          // SLIDESHOW && !INFINITE LOOP:
          if (!vars.animationLoop) slider.pause();
        }

        // SLIDE:
        if (!fade) {
          var dimension = (vertical) ? slider.slides.filter(':first').height() : slider.computedW,
              margin, slideString, calcNext;

          // INFINITE LOOP / REVERSE:
          if (carousel) {
            margin = (vars.itemWidth > slider.w) ? vars.itemMargin * 2 : vars.itemMargin;
            calcNext = ((slider.itemW + margin) * slider.move) * slider.animatingTo;
            slideString = (calcNext > slider.limit && slider.visible !== 1) ? slider.limit : calcNext;
          } else if (slider.currentSlide === 0 && target === slider.count - 1 && vars.animationLoop && slider.direction !== "next") {
            slideString = (reverse) ? (slider.count + slider.cloneOffset) * dimension : 0;
          } else if (slider.currentSlide === slider.last && target === 0 && vars.animationLoop && slider.direction !== "prev") {
            slideString = (reverse) ? 0 : (slider.count + 1) * dimension;
          } else {
            slideString = (reverse) ? ((slider.count - 1) - target + slider.cloneOffset) * dimension : (target + slider.cloneOffset) * dimension;
          }
          slider.setProps(slideString, "", vars.animationSpeed);
          if (slider.transitions) {
            if (!vars.animationLoop || !slider.atEnd) {
              slider.animating = false;
              slider.currentSlide = slider.animatingTo;
            }
            slider.container.unbind("webkitTransitionEnd transitionend");
            slider.container.bind("webkitTransitionEnd transitionend", function() {
              slider.wrapup(dimension);
            });
          } else {
            slider.container.animate(slider.args, vars.animationSpeed, vars.easing, function(){
              slider.wrapup(dimension);
            });
          }
        } else { // FADE:
          slider.slides.eq(slider.currentSlide).fadeOut(vars.animationSpeed, vars.easing);
          slider.slides.eq(target).fadeIn(vars.animationSpeed, vars.easing, slider.wrapup);
        }
        // SMOOTH HEIGHT:
        if (vars.smoothHeight) methods.smoothHeight(vars.animationSpeed);
      }
    }
    slider.wrapup = function(dimension) {
      // SLIDE:
      if (!fade && !carousel) {
        if (slider.currentSlide === 0 && slider.animatingTo === slider.last && vars.animationLoop) {
          slider.setProps(dimension, "jumpEnd");
        } else if (slider.currentSlide === slider.last && slider.animatingTo === 0 && vars.animationLoop) {
          slider.setProps(dimension, "jumpStart");
        }
      }
      slider.animating = false;
      slider.currentSlide = slider.animatingTo;
      // API: after() animation Callback
      vars.after(slider);
    }

    // SLIDESHOW:
    slider.animateSlides = function() {
      if (!slider.animating) slider.flexAnimate(slider.getTarget("next"));
    }
    // SLIDESHOW:
    slider.pause = function() {
      clearInterval(slider.animatedSlides);
      slider.playing = false;
      // PAUSEPLAY:
      if (vars.pausePlay) methods.pausePlay.update("play");
      // SYNC:
      if (slider.syncExists) methods.sync("pause");
    }
    // SLIDESHOW:
    slider.play = function() {
      slider.animatedSlides = setInterval(slider.animateSlides, vars.slideshowSpeed);
      slider.playing = true;
      // PAUSEPLAY:
      if (vars.pausePlay) methods.pausePlay.update("pause");
      // SYNC:
      if (slider.syncExists) methods.sync("play");
    }
    slider.canAdvance = function(target, fromNav) {
      // ASNAV:
      var last = (asNav) ? slider.pagingCount - 1 : slider.last;
      return (fromNav) ? true :
             (asNav && slider.currentItem === slider.count - 1 && target === 0 && slider.direction === "prev") ? true :
             (asNav && slider.currentItem === 0 && target === slider.pagingCount - 1 && slider.direction !== "next") ? false :
             (target === slider.currentSlide && !asNav) ? false :
             (vars.animationLoop) ? true :
             (slider.atEnd && slider.currentSlide === 0 && target === last && slider.direction !== "next") ? false :
             (slider.atEnd && slider.currentSlide === last && target === 0 && slider.direction === "next") ? false :
             true;
    }
    slider.getTarget = function(dir) {
      slider.direction = dir;
      if (dir === "next") {
        return (slider.currentSlide === slider.last) ? 0 : slider.currentSlide + 1;
      } else {
        return (slider.currentSlide === 0) ? slider.last : slider.currentSlide - 1;
      }
    }

    // SLIDE:
    slider.setProps = function(pos, special, dur) {
      var target = (function() {
        var posCheck = (pos) ? pos : ((slider.itemW + vars.itemMargin) * slider.move) * slider.animatingTo,
            posCalc = (function() {
              if (carousel) {
                return (special === "setTouch") ? pos :
                       (reverse && slider.animatingTo === slider.last) ? 0 :
                       (reverse) ? slider.limit - (((slider.itemW + vars.itemMargin) * slider.move) * slider.animatingTo) :
                       (slider.animatingTo === slider.last) ? slider.limit : posCheck;
              } else {
                switch (special) {
                  case "setTotal": return (reverse) ? ((slider.count - 1) - slider.currentSlide + slider.cloneOffset) * pos : (slider.currentSlide + slider.cloneOffset) * pos;
                  case "setTouch": return (reverse) ? pos : pos;
                  case "jumpEnd": return (reverse) ? pos : slider.count * pos;
                  case "jumpStart": return (reverse) ? slider.count * pos : pos;
                  default: return pos;
                }
              }
            }());
            return (posCalc * -1) + "px";
          }());

      if (slider.transitions) {
        target = (vertical) ? "translate3d(0," + target + ",0)" : "translate3d(" + target + ",0,0)";
        dur = (dur !== undefined) ? (dur/1000) + "s" : "0s";
        slider.container.css("-" + slider.pfx + "-transition-duration", dur);
      }

      slider.args[slider.prop] = target;
      if (slider.transitions || dur === undefined) slider.container.css(slider.args);
    }

    slider.setup = function(type) {
      // SLIDE:
      if (!fade) {
        var sliderOffset, arr;

        if (type === "init") {
          slider.viewport = $('<div class="' + namespace + 'viewport"></div>').css({"overflow": "hidden", "position": "relative"}).appendTo(slider).append(slider.container);
          // INFINITE LOOP:
          slider.cloneCount = 0;
          slider.cloneOffset = 0;
          // REVERSE:
          if (reverse) {
            arr = $.makeArray(slider.slides).reverse();
            slider.slides = $(arr);
            slider.container.empty().append(slider.slides);
          }
        }
        // INFINITE LOOP && !CAROUSEL:
        if (vars.animationLoop && !carousel) {
          slider.cloneCount = 2;
          slider.cloneOffset = 1;
          // clear out old clones
          if (type !== "init") slider.container.find('.clone').remove();
          slider.container.append(slider.slides.first().clone().addClass('clone')).prepend(slider.slides.last().clone().addClass('clone'));
        }
        slider.newSlides = $(vars.selector, slider);

        sliderOffset = (reverse) ? slider.count - 1 - slider.currentSlide + slider.cloneOffset : slider.currentSlide + slider.cloneOffset;
        // VERTICAL:
        if (vertical && !carousel) {
          slider.container.height((slider.count + slider.cloneCount) * 200 + "%").css("position", "absolute").width("100%");
          setTimeout(function(){
            slider.newSlides.css({"display": "block"});
            slider.doMath();
            slider.viewport.height(slider.h);
            slider.setProps(sliderOffset * slider.h, "init");
          }, (type === "init") ? 100 : 0);
        } else {
          slider.container.width((slider.count + slider.cloneCount) * 200 + "%");
          slider.setProps(sliderOffset * slider.computedW, "init");
          setTimeout(function(){
            slider.doMath();
            slider.newSlides.css({"width": slider.computedW, "float": "left", "display": "block"});
            // SMOOTH HEIGHT:
            if (vars.smoothHeight) methods.smoothHeight();
          }, (type === "init") ? 100 : 0);
        }
      } else { // FADE:
        slider.slides.css({"width": "100%", "float": "left", "marginRight": "-100%", "position": "relative"});
        if (type === "init") slider.slides.eq(slider.currentSlide).fadeIn(vars.animationSpeed, vars.easing);
        // SMOOTH HEIGHT:
        if (vars.smoothHeight) methods.smoothHeight();
      }
      // !CAROUSEL:
      // CANDIDATE: active slide
      if (!carousel) slider.slides.removeClass(namespace + "active-slide").eq(slider.currentSlide).addClass(namespace + "active-slide");
    }

    slider.doMath = function() {
      var slide = slider.slides.first(),
          slideMargin = vars.itemMargin,
          minItems = vars.minItems,
          maxItems = vars.maxItems;

      slider.w = slider.width();
      slider.h = slide.height();
      slider.boxPadding = slide.outerWidth() - slide.width();

      // CAROUSEL:
      if (carousel) {
        slider.itemT = vars.itemWidth + slideMargin;
        slider.minW = (minItems) ? minItems * slider.itemT : slider.w;
        slider.maxW = (maxItems) ? maxItems * slider.itemT : slider.w;
        slider.itemW = (slider.minW > slider.w) ? (slider.w - (slideMargin * minItems))/minItems :
                       (slider.maxW < slider.w) ? (slider.w - (slideMargin * maxItems))/maxItems :
                       (vars.itemWidth > slider.w) ? slider.w : vars.itemWidth;
        slider.visible = Math.floor(slider.w/(slider.itemW + slideMargin));
        slider.move = (vars.move > 0 && vars.move < slider.visible ) ? vars.move : slider.visible;
        slider.pagingCount = Math.ceil(((slider.count - slider.visible)/slider.move) + 1);
        slider.last =  slider.pagingCount - 1;
        slider.limit = (slider.pagingCount === 1) ? 0 :
                       (vars.itemWidth > slider.w) ? ((slider.itemW + (slideMargin * 2)) * slider.count) - slider.w - slideMargin : ((slider.itemW + slideMargin) * slider.count) - slider.w - slideMargin;
      } else {
        slider.itemW = slider.w;
        slider.pagingCount = slider.count;
        slider.last = slider.count - 1;
      }
      slider.computedW = slider.itemW - slider.boxPadding;
    }

    slider.update = function(pos, action) {
      slider.doMath();

      // update currentSlide and slider.animatingTo if necessary
      if (!carousel) {
        if (pos < slider.currentSlide) {
          slider.currentSlide += 1;
        } else if (pos <= slider.currentSlide && pos !== 0) {
          slider.currentSlide -= 1;
        }
        slider.animatingTo = slider.currentSlide;
      }

      // update controlNav
      if (vars.controlNav && !slider.manualControls) {
        if ((action === "add" && !carousel) || slider.pagingCount > slider.controlNav.length) {
          methods.controlNav.update("add");
        } else if ((action === "remove" && !carousel) || slider.pagingCount < slider.controlNav.length) {
          if (carousel && slider.currentSlide > slider.last) {
            slider.currentSlide -= 1;
            slider.animatingTo -= 1;
          }
          methods.controlNav.update("remove", slider.last);
        }
      }
      // update directionNav
      if (vars.directionNav) methods.directionNav.update();

    }

    slider.addSlide = function(obj, pos) {
      var $obj = $(obj);

      slider.count += 1;
      slider.last = slider.count - 1;

      // append new slide
      if (vertical && reverse) {
        (pos !== undefined) ? slider.slides.eq(slider.count - pos).after($obj) : slider.container.prepend($obj);
      } else {
        (pos !== undefined) ? slider.slides.eq(pos).before($obj) : slider.container.append($obj);
      }

      // update currentSlide, animatingTo, controlNav, and directionNav
      slider.update(pos, "add");

      // update slider.slides
      slider.slides = $(vars.selector + ':not(.clone)', slider);
      // re-setup the slider to accomdate new slide
      slider.setup();

      //FlexSlider: added() Callback
      vars.added(slider);
    }
    slider.removeSlide = function(obj) {
      var pos = (isNaN(obj)) ? slider.slides.index($(obj)) : obj;

      // update count
      slider.count -= 1;
      slider.last = slider.count - 1;

      // remove slide
      if (isNaN(obj)) {
        $(obj, slider.slides).remove();
      } else {
        (vertical && reverse) ? slider.slides.eq(slider.last).remove() : slider.slides.eq(obj).remove();
      }

      // update currentSlide, animatingTo, controlNav, and directionNav
      slider.doMath();
      slider.update(pos, "remove");

      // update slider.slides
      slider.slides = $(vars.selector + ':not(.clone)', slider);
      // re-setup the slider to accomdate new slide
      slider.setup();

      // FlexSlider: removed() Callback
      vars.removed(slider);
    }

    //FlexSlider: Initialize
    methods.init();
  }

  //FlexSlider: Default Settings
  $.flexslider.defaults = {
    namespace: "flex-",             //{NEW} String: Prefix string attached to the class of every element generated by the plugin
    selector: ".slides > li",       //{NEW} Selector: Must match a simple pattern. '{container} > {slide}' -- Ignore pattern at your own peril
    animation: "fade",              //String: Select your animation type, "fade" or "slide"
    easing: "swing",               //{NEW} String: Determines the easing method used in jQuery transitions. jQuery easing plugin is supported!
    direction: "horizontal",        //String: Select the sliding direction, "horizontal" or "vertical"
    reverse: false,                 //{NEW} Boolean: Reverse the animation direction
    animationLoop: true,             //Boolean: Should the animation loop? If false, directionNav will received "disable" classes at either end
    smoothHeight: false,            //{NEW} Boolean: Allow height of the slider to animate smoothly in horizontal mode
    startAt: 0,                     //Integer: The slide that the slider should start on. Array notation (0 = first slide)
    slideshow: true,                //Boolean: Animate slider automatically
    slideshowSpeed: 7000,           //Integer: Set the speed of the slideshow cycling, in milliseconds
    animationSpeed: 600,            //Integer: Set the speed of animations, in milliseconds
    initDelay: 0,                   //{NEW} Integer: Set an initialization delay, in milliseconds
    randomize: false,               //Boolean: Randomize slide order

    // Usability features
    pauseOnAction: true,            //Boolean: Pause the slideshow when interacting with control elements, highly recommended.
    pauseOnHover: false,            //Boolean: Pause the slideshow when hovering over slider, then resume when no longer hovering
    useCSS: true,                   //{NEW} Boolean: Slider will use CSS3 transitions if available
    touch: true,                    //{NEW} Boolean: Allow touch swipe navigation of the slider on touch-enabled devices
    video: false,                   //{NEW} Boolean: If using video in the slider, will prevent CSS3 3D Transforms to avoid graphical glitches

    // Primary Controls
    controlNav: true,               //Boolean: Create navigation for paging control of each clide? Note: Leave true for manualControls usage
    directionNav: true,             //Boolean: Create navigation for previous/next navigation? (true/false)
    prevText: "Previous",           //String: Set the text for the "previous" directionNav item
    nextText: "Next",               //String: Set the text for the "next" directionNav item

    // Secondary Navigation
    keyboard: true,                 //Boolean: Allow slider navigating via keyboard left/right keys
    multipleKeyboard: false,        //{NEW} Boolean: Allow keyboard navigation to affect multiple sliders. Default behavior cuts out keyboard navigation with more than one slider present.
    mousewheel: false,              //{UPDATED} Boolean: Requires jquery.mousewheel.js (https://github.com/brandonaaron/jquery-mousewheel) - Allows slider navigating via mousewheel
    pausePlay: false,               //Boolean: Create pause/play dynamic element
    pauseText: "Pause",             //String: Set the text for the "pause" pausePlay item
    playText: "Play",               //String: Set the text for the "play" pausePlay item

    // Special properties
    controlsContainer: "",          //{UPDATED} jQuery Object/Selector: Declare which container the navigation elements should be appended too. Default container is the FlexSlider element. Example use would be $(".flexslider-container"). Property is ignored if given element is not found.
    manualControls: "",             //{UPDATED} jQuery Object/Selector: Declare custom control navigation. Examples would be $(".flex-control-nav li") or "#tabs-nav li img", etc. The number of elements in your controlNav should match the number of slides/tabs.
    sync: "",                       //{NEW} Selector: Mirror the actions performed on this slider with another slider. Use with care.
    asNavFor: "",                   //{NEW} Selector: Internal property exposed for turning the slider into a thumbnail navigation for another slider

    // Carousel Options
    itemWidth: 0,                   //{NEW} Integer: Box-model width of individual carousel items, including horizontal borders and padding.
    itemMargin: 0,                  //{NEW} Integer: Margin between carousel items.
    minItems: 0,                    //{NEW} Integer: Minimum number of carousel items that should be visible. Items will resize fluidly when below this.
    maxItems: 0,                    //{NEW} Integer: Maxmimum number of carousel items that should be visible. Items will resize fluidly when above this limit.
    move: 0,                        //{NEW} Integer: Number of carousel items that should move on animation. If 0, slider will move all visible items.

    // Callback API
    start: function(){},            //Callback: function(slider) - Fires when the slider loads the first slide
    before: function(){},           //Callback: function(slider) - Fires asynchronously with each slider animation
    after: function(){},            //Callback: function(slider) - Fires after each slider animation completes
    end: function(){},              //Callback: function(slider) - Fires when the slider reaches the last slide (asynchronous)
    added: function(){},            //{NEW} Callback: function(slider) - Fires after a slide is added
    removed: function(){}           //{NEW} Callback: function(slider) - Fires after a slide is removed
  }


  //FlexSlider: Plugin Function
  $.fn.flexslider = function(options) {
    if (options === undefined) options = {};

    if (typeof options === "object") {
      return this.each(function() {
        var $this = $(this),
            selector = (options.selector) ? options.selector : ".slides > li",
            $slides = $this.find(selector);

        if ($slides.length === 1) {
          $slides.fadeIn(400);
          if (options.start) options.start($this);
        } else if ($this.data('flexslider') === undefined) {
          new $.flexslider(this, options);
        }
      });
    } else {
      // Helper strings to quickly perform functions on the slider
      var $slider = $(this).data('flexslider');
      switch (options) {
        case "play": $slider.play(); break;
        case "pause": $slider.pause(); break;
        case "next": $slider.flexAnimate($slider.getTarget("next"), true); break;
        case "prev":
        case "previous": $slider.flexAnimate($slider.getTarget("prev"), true); break;
        default: if (typeof options === "number") $slider.flexAnimate(options, true);
      }
    }
  }

})(jQuery);;
( function( $ ) {
	$( window ).load( function() {
		$( '.featured' ).css( {
			display: 'none'
		} );

		$( '.featured:first-child' ).css( {
			display: 'list-item'
		} );

		$( '.featured-posts-wrapper' ).animate( {
			opacity:1
		},400 );

		$( '.featured-posts' ).flexslider( {
			animation: 'fade',
			slideshow: false,
			before: function( slider ){
				$( window ).trigger( 'resize' );
			}
		} );

		$( '.featured-posts-super-wrapper' ).removeClass( 'loading' );
	} );
} )( jQuery );;
/***
 * Warning: This file is remotely enqueued in Jetpack's Masterbar module.
 * Changing it will also affect Jetpack sites.
 */
jQuery( document ).ready( function( $, wpcom ) {
	var masterbar,
		menupops = $( 'li#wp-admin-bar-blog.menupop, li#wp-admin-bar-newdash.menupop, li#wp-admin-bar-my-account.menupop' ),
		newmenu = $( '#wp-admin-bar-new-post-types' );

	// Unbind hoverIntent, we want clickable menus.
	menupops
		.unbind( 'mouseenter mouseleave' )
		.removeProp( 'hoverIntent_t' )
		.removeProp( 'hoverIntent_s' )
		.on( 'mouseover', function(e) {
			var li = $(e.target).closest( 'li.menupop' );
			menupops.not(li).removeClass( 'ab-hover' );
			li.toggleClass( 'ab-hover' );
		} )
		.on( 'click touchstart', function(e) {
			var $target = $( e.target );

			if ( masterbar.focusSubMenus( $target ) ) {
				return;
			}

			e.preventDefault();
			masterbar.toggleMenu( $target );
		} );

	masterbar = {
		focusSubMenus: function( $target ) {
			// Handle selection of menu items
			if ( ! $target.closest( 'ul' ).hasClass( 'ab-top-menu' ) ) {
				$target
					.closest( 'li' );

				return true;
			}

			return false;
		},

		toggleMenu: function( $target ) {
			var $li = $target.closest( 'li.menupop' ),
				$html = $( 'html' );

			$( 'body' ).off( 'click.ab-menu' );
			$( '#wpadminbar li.menupop' ).not($li).removeClass( 'ab-active wpnt-stayopen wpnt-show' );

			if ( $li.hasClass( 'ab-active' ) ) {
				$li.removeClass( 'ab-active' );
				$html.removeClass( 'ab-menu-open' );
			} else {
				$li.addClass( 'ab-active' );
				$html.addClass( 'ab-menu-open' );

				$( 'body' ).on( 'click.ab-menu', function( e ) {
					if ( ! $( e.target ).parents( '#wpadminbar' ).length ) {
						e.preventDefault();
						masterbar.toggleMenu( $li );
						$( 'body' ).off( 'click.ab-menu' );
					}
				} );
			}
		}
	};
} );;
/*globals JSON */
( function( $ ) {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		//top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		//my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		//my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		//my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		//my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		//reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		//account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		//account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	$( document ).ready( function() {
		var trackableLinks = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		$( trackableLinks ).on( 'click touchstart', function( e ) {
			var $target = $( e.target ),
				$parent = $target.closest( 'li' );

			if ( ! $parent ) {
				return;
			}

			var trackingId = $target.attr( 'ID' ) || $parent.attr( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };

			recordTracksEvent( eventProps );
		} );
	} );

	// listen for postMessage events from the notifications iframe
	$( window ).on( 'message', function( e ) {
		var event = ! e.data && e.originalEvent.data ? e.originalEvent : event;
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( 'string' === typeof event.data ) ? parseJson( event.data, {} ) : event.data;
		if ( 'notesIframeMessage' !== data.type ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	} );

} )( jQuery );
;
var wpcom = window.wpcom || {};
wpcom.actionbar = {};
wpcom.actionbar.data = actionbardata;

// This might be better in another file, but is here for now
(function($){
	var fbd = wpcom.actionbar.data,
			d = document,
			docHeight = $( d ).height(),
			b = d.getElementsByTagName( 'body' )[0],
			lastScrollTop = 0,
			lastScrollDir, fb, fhtml, fbhtml, fbHtmlLi,
			followingbtn, followbtn, fbdf, action,
			slkhtml = '', foldhtml = '', reporthtml = '',
			customizeIcon, editIcon, statsIcon, themeHtml = '', signupHtml = '', loginHtml = '',
			viewReaderHtml = '', editSubsHtml = '', editFollowsHtml = '',
			toggleactionbar, $actionbar;

	// Don't show actionbar when iframed
	if ( window != window.top ) {
		return;
	}

	fhtml = '<ul>';

	// Customize Icon
	customizeIcon = '<svg class="gridicon gridicon__customize" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M2 6c0-1.505.78-3.08 2-4 0 .845.69 2 2 2 1.657 0 3 1.343 3 3 0 .386-.08.752-.212 1.09.74.594 1.476 1.19 2.19 1.81L8.9 11.98c-.62-.716-1.214-1.454-1.807-2.192C6.753 9.92 6.387 10 6 10c-2.21 0-4-1.79-4-4zm12.152 6.848l1.34-1.34c.607.304 1.283.492 2.008.492 2.485 0 4.5-2.015 4.5-4.5 0-.725-.188-1.4-.493-2.007L18 9l-2-2 3.507-3.507C18.9 3.188 18.225 3 17.5 3 15.015 3 13 5.015 13 7.5c0 .725.188 1.4.493 2.007L3 20l2 2 6.848-6.848c1.885 1.928 3.874 3.753 5.977 5.45l1.425 1.148 1.5-1.5-1.15-1.425c-1.695-2.103-3.52-4.092-5.448-5.977z" data-reactid=".2.1.1:0.1b.0"></path></g></svg>';

	if ( fbd.canCustomizeSite && fbd.isLoggedIn ) {
		fhtml += '<li class="actnbr-btn actnbr-customize"><a href="'+ fbd.customizeLink +'">' + customizeIcon + '<span>' + fbd.i18n.customize + '<span></a></li>';
	}

	// Edit Icon
	editIcon = '<svg class="gridicon gridicon__pencil" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M13 6l5 5-9.507 9.507c-.686-.686-.69-1.794-.012-2.485l-.002-.003c-.69.676-1.8.673-2.485-.013-.677-.677-.686-1.762-.036-2.455l-.008-.008c-.694.65-1.78.64-2.456-.036L13 6zm7.586-.414l-2.172-2.172c-.78-.78-2.047-.78-2.828 0L14 5l5 5 1.586-1.586c.78-.78.78-2.047 0-2.828zM3 18v3h3c0-1.657-1.343-3-3-3z"></path></g></svg>';

	if ( fbd.canEditPost ) {
		fhtml += '<li class="actnbr-btn actnbr-edit"><a href="'+ fbd.editLink +'">' + editIcon + '<span>' + fbd.i18n.edit + '</span></a></li>';
	}

	// Stats Icon
	statsIcon = '<svg class="gridicon gridicon__stats-alt" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M21,21H3v-2h18V21z M8,10H4v7h4V10z M14,3h-4v14h4V3z M20,6h-4v11h4V6z"/></path></g></svg>';

	if ( fbd.canEditPost ) {
		fhtml += '<li class="actnbr-btn actnbr-stats"><a href="'+ fbd.statsLink +'">' + statsIcon + '<span>' + fbd.i18n.stats + '</span></a></li>';
	}

	// Follow/Unfollow Icon
	followingbtn = '<svg class="gridicon gridicon__following" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M23 13.482L15.508 21 12 17.4l1.412-1.388 2.106 2.188 6.094-6.094L23 13.482zm-7.455 1.862L20 10.89V2H2v14c0 1.1.9 2 2 2h4.538l4.913-4.832 2.095 2.176zM8 13H4v-1h4v1zm3-2H4v-1h7v1zm0-2H4V8h7v1zm7-3H4V4h14v2z"/></g></svg>';
	followbtn = '<svg class="gridicon gridicon__follow" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M23 16v2h-3v3h-2v-3h-3v-2h3v-3h2v3h3zM20 2v9h-4v3h-3v4H4c-1.1 0-2-.9-2-2V2h18zM8 13v-1H4v1h4zm3-3H4v1h7v-1zm0-2H4v1h7V8zm7-4H4v2h14V4z"/></g></svg>';

	fbhtml = '<a class="actnbr-action actnbr-actn-follow" href="">' + followbtn + '<span>' + fbd.i18n.follow + '</span></a>';
	if ( fbd.isFollowing ) {
		fbhtml = '<a class="actnbr-action actnbr-actn-following" href="">' + followingbtn + '<span>' + fbd.i18n.following + '</span></a>';
	}

	// Show follow/unfollow icon on top level, when this is not your own site
	if ( fbd.canFollow && ! ( fbd.canEditPost || fbd.canCustomizeSite ) ) {
		fhtml += '<li class="actnbr-btn actnbr-hidden"> \
			    	' + fbhtml + ' \
			    	<div class="actnbr-popover tip tip-top-left actnbr-notice"> \
			    		<div class="tip-arrow"></div> \
			    		<div class="tip-inner actnbr-follow-bubble"></div> \
			    	</div> \
			    </li>';
	}

	if ( ! fbd.canCustomizeSite ) {
		// Report Link
		reporthtml = '<li class="flb-report"><a href="http://en.wordpress.com/abuse/">' + fbd.i18n.report + '</a></li>';
	}

	// Show shortlink on single posts
	if ( fbd.isSingular ) {
		slkhtml = '<li class="actnbr-shortlink"><a href="' + fbd.shortlink + '">' + fbd.i18n.shortlink + '</a></li>'
	}

	// Set up fold/unfold menu item
	foldhtml = '<li class="actnbr-fold"><a href="">' + fbd.i18n.foldBar + '</a></li>'
	if ( fbd.isFolded ) {
		foldhtml = '<li class="actnbr-fold"><a href="">' + fbd.i18n.unfoldBar + '</a></li>'
	}
	if ( ! fbd.isLoggedIn && ! fbd.canFollow ) {
		foldhtml = '';
	}

	if ( fbd.isLoggedIn ) {
		if ( '' != fbd.themeURL ) {
			themeHtml = '<li class="actnbr-theme"><a href="' + fbd.themeURL + '">' + fbd.i18n.themeInfo.replace( /{theme}/, fbd.themeName ) + '</a></li>';
		}
		if ( fbd.canFollow ) {
			if ( fbd.isSingular ) {
				viewReaderHtml = '<li class="actnbr-reader"><a href="https://wordpress.com/read/blogs/' + fbd.siteID + '/posts/' + fbd.postID +'">' + fbd.i18n.viewReadPost + '</a></li>';
			} else {
				viewReaderHtml = '<li class="actnbr-reader"><a href="https://wordpress.com/read/' + ( fbd.feedID ? 'feeds/' + fbd.feedID : 'blogs/' + fbd.siteID ) + '">' + fbd.i18n.viewReader + '</a></li>';
			}
		}
		editFollowsHtml = '<li class="actnbr-follows"><a href="https://wordpress.com/following/edit">' + fbd.i18n.editSubs + '</a></li>';
	} else {
		loginHtml += '<li class="actnbr-login"><a href="' + fbd.loginURL + '">' + fbd.i18n.login + '</a></li>';
		signupHtml = '<li class="actnbr-signup"><a href="' + fbd.signupURL + '">' + fbd.i18n.signup + '</a></li>';
		editSubsHtml = '<li class="actnbr-subs"><a href="https://subscribe.wordpress.com/">' + fbd.i18n.editSubs + '</a></li>';
	}

	// Hide follow/unfollow completely for static sites, and sites not allowing followers (VIP, private, etc).
	if ( ! fbd.canFollow ) {
		fbHtmlLi = '';
	} else {
		fbHtmlLi = '<li class="actnbr-folded-follow">' + fbhtml + '</li>';
	}

	// Ellipsis Menu
	fhtml += '<li class="actnbr-ellipsis actnbr-hidden"> \
			  <svg class="gridicon gridicon__ellipsis" height="24" width="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="12" r="2"/></g></svg> \
			  <div class="actnbr-popover tip tip-top-left actnbr-more"> \
			  	<div class="tip-arrow"></div> \
			  	<div class="tip-inner"> \
				  <ul> \
				    <li class="actnbr-sitename"><a href="' + fbd.siteURL + '">' + fbd.icon + ' ' + actionBarEscapeHtml( fbd.siteName ) + '</a></li> \
				   	<li class="actnbr-folded-customize"><a href="'+ fbd.customizeLink +'">' + customizeIcon + '<span>' + fbd.i18n.customize + '<span></a></li> \
				    ' + fbHtmlLi + ' \
					' + signupHtml + ' \
				    ' + loginHtml + ' \
				    ' + themeHtml + ' \
				    ' + slkhtml + ' \
				    ' + reporthtml + ' \
				    ' + viewReaderHtml + ' \
				    ' + editFollowsHtml + ' \
				    ' + editSubsHtml + ' \
				    ' + foldhtml + ' \
			      </ul> \
			    </div> \
		      </div> \
		    </li> \
	      </ul>';

	fbdf = d.createElement( 'div' );
	fbdf.id = 'actionbar';
	fbdf.innerHTML = fhtml;
	b.appendChild( fbdf );

	$actionbar = $( '#actionbar' ).addClass( 'actnbr-' + fbd.themeSlug.replace( '/', '-' ) );

	// Add classes based on contents
	if ( fbd.canCustomizeSite ) {
		$actionbar.addClass( 'actnbr-has-customize' );
	}

	if ( fbd.canEditPost ) {
		$actionbar.addClass( 'actnbr-has-edit' );
	}

	if ( ! fbd.canCustomizeSite ) {
		$actionbar.addClass( 'actnbr-has-follow' );
	}

	if ( fbd.isFolded ) {
		$actionbar.addClass( 'actnbr-folded' );
	}

	// Show status message if available
	if ( fbd.statusMessage ) {
		showActionBarStatusMessage( fbd.statusMessage );
	}

	// *** Actions *****************

	// Follow Site
	$actionbar.on(  'click', '.actnbr-actn-follow', function(e) {
		e.preventDefault();

		if ( fbd.isLoggedIn ) {
			showActionBarStatusMessage( '<div class="actnbr-reader">' + fbd.i18n.followedText + '</div>' );
			bumpStat( 'followed' );
			request( 'ab_subscribe_to_blog' );
		} else {
			showActionBarFollowForm();
		}
	} )

	// UnFollow Site
	.on(  'click', '.actnbr-actn-following', function(e) {
		e.preventDefault();
		$( '#actionbar .actnbr-actn-following' ).replaceWith( '<a class="actnbr-action actnbr-actn-follow" href="">' + followbtn + '<span>' + fbd.i18n.follow + '</span></a>' );

		bumpStat( 'unfollowed' );
		request( 'ab_unsubscribe_from_blog' );
	} )

	// Show shortlink prompt
	.on( 'click', '.actnbr-shortlink a', function(e) {
		e.preventDefault();
		window.prompt( "Shortlink: ", fbd.shortlink );
	} )

	// Toggle more menu
	.on( 'click', '.actnbr-ellipsis', function(e) {
		if ( $( e.target ).closest( 'a' ).hasClass( 'actnbr-action' ) ) {
			return false;
		}

		var popoverLi = $( '#actionbar .actnbr-ellipsis' );
		popoverLi.toggleClass( 'actnbr-hidden' );

		setTimeout( function() {
			if ( ! popoverLi.hasClass( 'actnbr-hidden' ) ) {
				bumpStat( 'show_more_menu' );

				$( document ).on( 'click.actnbr-body-click', function() {
					popoverLi.addClass( 'actnbr-hidden' );

					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	})

	// Fold/Unfold
	.on( 'click', '.actnbr-fold', function(e) {
		e.preventDefault();

		if ( $( '#actionbar' ).hasClass( 'actnbr-folded' ) ) {
			$( '.actnbr-fold a' ).html( fbd.i18n.foldBar );
			$( '#actionbar' ).removeClass( 'actnbr-folded' );

			$.post( fbd.xhrURL, { 'action': 'unfold_actionbar' } );
		} else {
			$( '.actnbr-fold a' ).html( fbd.i18n.unfoldBar );
			$( '#actionbar' ).addClass( 'actnbr-folded' );

			$.post( fbd.xhrURL, { 'action': 'fold_actionbar' } );
		}
	})

	// Record stats for clicks
	.on( 'click', '.actnbr-sitename a', createStatsBumperEventHandler( 'clicked_site_title' ) )
	.on( 'click', '.actnbr-customize a', createStatsBumperEventHandler( 'customized' ) )
	.on( 'click', '.actnbr-folded-customize a', createStatsBumperEventHandler( 'customized' ) )
	.on( 'click', '.actnbr-theme a', createStatsBumperEventHandler( 'explored_theme' ) )
	.on( 'click', '.actnbr-edit a', createStatsBumperEventHandler( 'edited' ) )
	.on( 'click', '.actnbr-stats a', createStatsBumperEventHandler( 'clicked_stats' ) )
	.on( 'click', '.flb-report a', createStatsBumperEventHandler( 'reported_content' ) )
	.on( 'click', '.actnbr-follows a', createStatsBumperEventHandler( 'managed_following' ) )
	.on( 'click', '.actnbr-shortlink a', function() {
		bumpStat( 'copied_shortlink' );
	} )
	.on( 'click', '.actnbr-reader a', createStatsBumperEventHandler( 'view_reader' ) )
	.on( 'submit', '.actnbr-follow-bubble form', createStatsBumperEventHandler( 'submit_follow_form', function() {
		$( '#actionbar .actnbr-follow-bubble form button' ).attr( 'disabled', true );
	} ) )
	.on( 'click', '.actnbr-login-nudge a', createStatsBumperEventHandler( 'clicked_login_nudge' ) )
	.on( 'click', '.actnbr-signup a', createStatsBumperEventHandler( 'clicked_signup_link' ) )
	.on( 'click', '.actnbr-login a', createStatsBumperEventHandler( 'clicked_login_link' ) )
	.on( 'click', '.actnbr-subs a', createStatsBumperEventHandler( 'clicked_manage_subs_link' ) );

	// Make Follow/Unfollow requests
	var request = function( action ) {
		$.post( fbd.xhrURL, {
			'action': action,
			'_wpnonce': fbd.nonce,
			'source': 'actionbar',
			'blog_id': fbd.siteID
		});
	};

	// Show/Hide actionbar on scroll
	fb = $('#actionbar');
	toggleactionbar = function() {
		var st = $(window).scrollTop(),
			topOffset = 0;

		if ( $(window).scrollTop() < 0 ) {
			return;
		}

		// Still
		if ( lastScrollTop == 0 || ( ( st == lastScrollTop ) && lastScrollDir == 'up' ) ) {
			fb.removeClass( 'actnbr-hidden' );

		// Moving
		} else {
			 // Scrolling Up
		    if ( st < lastScrollTop ){
				fb.removeClass( 'actnbr-hidden' );
				lastScrollDir = 'up';

			// Scrolling Down
			} else {
				// check if there are any popovers open, and only hide action bar if not
				if ( $( '#actionbar > ul > li:not(.actnbr-hidden) > .actnbr-popover' ).length === 0 ) {
					fb.addClass( 'actnbr-hidden' );
					lastScrollDir = 'down';

					// Hide any menus
					$( '#actionbar li' ).addClass( 'actnbr-hidden' );
				}
			}
		}

		lastScrollTop = st;
	};
	setInterval( toggleactionbar, 100 );

	// Bump stats
	var bumpStat = function( stat ) {
		return $.post( fbd.xhrURL, {
			'action': 'actionbar_stats',
			'stat': stat
		} );
	};

	/**
	 * A factory method for creating an event handler function that will bump a specific stat and ONLY THEN re-dispatch
	 * the event. This will ensure that the bumped stat is indeed recorded before navigating the page away, as otherwise
	 * some browsers may very well decide to cancel the stat request in that case.
	 *
	 * @param {String} stat the name of the stat to bump
	 * @param {Function} additionalEffect an additional function that should be called after the stat is bumped
	 */
	function createStatsBumperEventHandler( stat, additionalEffect ) {
		var completedEvents = {};

		return function eventHandler( event ) {
			if ( completedEvents[ event.timeStamp ] ) {
				delete completedEvents[ event.timeStamp ];

				// hack-around to submit forms, dispatching "submit" event is not enough for them
				if ( event.type === 'submit' ) {
					event.target.submit();
				}

				if ( typeof additionalEffect === 'function' ) {
					return additionalEffect( event );
				}

				return true;
			}

			event.preventDefault();
			event.stopPropagation();

			function dispatchOriginalEvent() {
				var newEvent;

				// Retrieves the native event object created by the browser from the jQuery event object
				var originalEvent = event.originalEvent;

				/**
				 * Handles Internet Explorer that doesn't support Event nor CustomEvent constructors
				 *
				 * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
				 * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
				 * @see https://stackoverflow.com/questions/26596123/internet-explorer-9-10-11-event-constructor-doesnt-work/
				 */
				if ( typeof window.CustomEvent !== 'function' ) {
					newEvent = document.createEvent( 'CustomEvent' );
					newEvent.initCustomEvent(
						originalEvent.type,
						originalEvent.bubbles,
						originalEvent.cancelable,
						originalEvent.detail
					);
				} else {
					newEvent = new originalEvent.constructor( originalEvent.type, originalEvent );
				}

				completedEvents[ newEvent.timeStamp ] = true;

				originalEvent.target.dispatchEvent( newEvent );
			}

			bumpStat( stat ).then( dispatchOriginalEvent, dispatchOriginalEvent );
		}
	}

	function actionBarEscapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			var entityMap = {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': '&quot;',
				"'": '&#39;',
				"/": '&#x2F;'
			};
			return entityMap[s];
		});
	}

	function showActionBarStatusMessage( message ) {
		$( '#actionbar .actnbr-actn-follow' ).replaceWith( '<a class="actnbr-action actnbr-actn-following" href="">' + followingbtn + '<span>' + fbd.i18n.following + '</span></a>' );
		$( '#actionbar .actnbr-follow-bubble' ).html( ' \
			<ul> \
				<li class="actnbr-sitename"><a href="' + fbd.siteURL + '">' + fbd.icon + ' ' + actionBarEscapeHtml( fbd.siteName ) + '</a></li> \
				<li class="actnbr-message">' + message + '</li> \
			</ul> \
		');

		var btn = $( '#actionbar .actnbr-btn' );
		btn.removeClass( 'actnbr-hidden' );

		setTimeout( function() {
			if ( ! btn.hasClass( 'actnbr-hidden' ) ) {
				$( '#actionbar .actnbr-email-field' ).focus();
				$( document ).on( 'click.actnbr-body-click', function(e) {
					if ( $( e.target ).closest( '.actnbr-popover' )[0] ) {
						return;
					}
					btn.addClass( 'actnbr-hidden' );
					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	}

	function showActionBarFollowForm() {
		var btn = $( '#actionbar .actnbr-btn' );
		btn.toggleClass( 'actnbr-hidden' );

		var form = $('<form>');
		if ( fbd.i18n.followers )
			form.append($('<div class="actnbr-follow-count">').html(fbd.i18n.followers));
		form.append($('<div>').append($('<input>').attr({"type": "email", "name": "email", "placeholder": fbd.i18n.enterEmail, "class": "actnbr-email-field"})));
		form.append($('<input type="hidden" name="action" value="subscribe"/>'));
		form.append($('<input type="hidden" name="blog_id">').attr('value', fbd.siteID));
		form.append($('<input type="hidden" name="source">').attr('value', fbd.referer));
		form.append($('<input type="hidden" name="sub-type" value="actionbar-follow"/>'));
		form.append($(fbd.subscribeNonce));
		form.append($('<div class="actnbr-button-wrap">').append($('<button type="submit">').attr('value', fbd.i18n.subscribe).html(fbd.i18n.subscribe)));
		form.attr('method', 'post');
		form.attr('action', 'https://subscribe.wordpress.com');
		form.attr('accept-charset', 'utf-8');

		var html = $('<ul/>');
		html.append($('<li class="actnbr-sitename">').append($('<a>').attr('href', fbd.siteURL).append($(fbd.icon)).append(' ' + actionBarEscapeHtml( fbd.siteName ))))
		html.append($('<li>').append(form));
		html.append($('<li class="actnbr-login-nudge">').append($('<div>').html(fbd.i18n.alreadyUser)));

		$( '#actionbar .actnbr-follow-bubble' ).empty().append(html);

		setTimeout( function() {
			if ( ! btn.hasClass( 'actnbr-hidden' ) ) {
				bumpStat( 'show_follow_form' );

				$( '#actionbar .actnbr-email-field' ).focus();

				$( document ).on( 'click.actnbr-body-click', function( event ) {
					if ( $( event.target ).closest( '.actnbr-popover' )[ 0 ] ) {
						return;
					}

					btn.addClass( 'actnbr-hidden' );

					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	}
})(jQuery);
;
var ak_js = document.getElementById( "ak_js" );

if ( ! ak_js ) {
	ak_js = document.createElement( 'input' );
	ak_js.setAttribute( 'id', 'ak_js' );
	ak_js.setAttribute( 'name', 'ak_js' );
	ak_js.setAttribute( 'type', 'hidden' );
}
else {
	ak_js.parentNode.removeChild( ak_js );
}

ak_js.setAttribute( 'value', ( new Date() ).getTime() );

var commentForm = document.getElementById( 'commentform' );

if ( commentForm ) {
	commentForm.appendChild( ak_js );
}
else {
	var replyRowContainer = document.getElementById( 'replyrow' );

	if ( replyRowContainer ) {
		var children = replyRowContainer.getElementsByTagName( 'td' );

		if ( children.length > 0 ) {
			children[0].appendChild( ak_js );
		}
	}
};
/* global WPCOM_sharing_counts, Recaptcha */
var sharing_js_options;
if ( sharing_js_options && sharing_js_options.counts ) {
	var WPCOMSharing = {
		done_urls : [],
		get_counts : function() {
			var url, requests, id, service, service_request;

			if ( 'undefined' === typeof WPCOM_sharing_counts ) {
				return;
			}

			for ( url in WPCOM_sharing_counts ) {
				id = WPCOM_sharing_counts[ url ];

				if ( 'undefined' !== typeof WPCOMSharing.done_urls[ id ] ) {
					continue;
				}

				requests = {
					// LinkedIn actually gets the share count for both the http and https version automatically -- so we don't need to do extra magic
					linkedin: [
						'https://www.linkedin.com/countserv/count/share?format=jsonp&callback=WPCOMSharing.update_linkedin_count&url=' +
							encodeURIComponent( url )
					],
					// Pinterest, like LinkedIn, handles share counts for both http and https
					pinterest: [
						window.location.protocol +
							'//api.pinterest.com/v1/urls/count.json?callback=WPCOMSharing.update_pinterest_count&url=' +
							encodeURIComponent( url )
					],
					// Facebook protocol summing has been shown to falsely double counts, so we only request the current URL
					facebook: [
						window.location.protocol +
							'//graph.facebook.com/?callback=WPCOMSharing.update_facebook_count&ids=' +
							encodeURIComponent( url )
					]
				};

				for ( service in requests ) {
					if ( ! jQuery( 'a[data-shared=sharing-' + service + '-' + id  + ']' ).length ) {
						continue;
					}

					while ( ( service_request = requests[ service ].pop() ) ) {
						jQuery.getScript( service_request );
					}

					WPCOMSharing.bump_sharing_count_stat( service );
				}

				WPCOMSharing.done_urls[ id ] = true;
			}
		},

		// get the version of the url that was stored in the dom (sharing-$service-URL)
		get_permalink: function( url ) {
			if ( 'https:' === window.location.protocol ) {
				url = url.replace( /^http:\/\//i, 'https://' );
			} else {
				url = url.replace( /^https:\/\//i, 'http://' );
			}

			return url;
		},
		update_facebook_count: function( data ) {
			var url, permalink;

			if ( ! data ) {
				return;
			}

			for ( url in data ) {
				if ( ! data.hasOwnProperty( url ) || ! data[ url ].share || ! data[ url ].share.share_count ) {
					continue;
				}

				permalink = WPCOMSharing.get_permalink( url );

				if ( ! ( permalink in WPCOM_sharing_counts ) ) {
					continue;
				}

				WPCOMSharing.inject_share_count( 'sharing-facebook-' + WPCOM_sharing_counts[ permalink ], data[ url ].share.share_count );
			}
		},
		update_linkedin_count : function( data ) {
			if ( 'undefined' !== typeof data.count && ( data.count * 1 ) > 0 ) {
				WPCOMSharing.inject_share_count( 'sharing-linkedin-' + WPCOM_sharing_counts[ data.url ], data.count );
			}
		},
		update_pinterest_count : function( data ) {
			if ( 'undefined' !== typeof data.count && ( data.count * 1 ) > 0 ) {
				WPCOMSharing.inject_share_count( 'sharing-pinterest-' + WPCOM_sharing_counts[ data.url ], data.count );
			}
		},
		inject_share_count : function( id, count ) {
			var $share = jQuery( 'a[data-shared=' + id + '] > span');
			$share.find( '.share-count' ).remove();
			$share.append( '<span class="share-count">' + WPCOMSharing.format_count( count ) + '</span>' );
		},
		format_count : function( count ) {
			if ( count < 1000 ) {
				return count;
			}
			if ( count >= 1000 && count < 10000 ) {
				return String( count ).substring( 0, 1 ) + 'K+';
			}
			return '10K+';
		},
		bump_sharing_count_stat: function( service ) {
			new Image().src = document.location.protocol + '//pixel.wp.com/g.gif?v=wpcom-no-pv&x_sharing-count-request=' + service + '&r=' + Math.random();
		}
	};
}

(function($){
	var $body, $sharing_email;

	$.fn.extend( {
		share_is_email: function() {
			return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test( this.val() );
		}
	} );

	$body = $( document.body ).on( 'post-load', WPCOMSharing_do );
	$( document ).on( 'ready', function() {
		$sharing_email = $( '#sharing_email' );
		$body.append( $sharing_email );
		WPCOMSharing_do();
	} );

	function WPCOMSharing_do() {
		var $more_sharing_buttons;
		if ( 'undefined' !== typeof WPCOMSharing ) {
			WPCOMSharing.get_counts();
		}
		$more_sharing_buttons = $( '.sharedaddy a.sharing-anchor' );

		$more_sharing_buttons.click( function() {
			return false;
		} );

		$( '.sharedaddy a' ).each( function() {
			if ( $( this ).attr( 'href' ) && $( this ).attr( 'href' ).indexOf( 'share=' ) !== -1 ) {
				$( this ).attr( 'href', $( this ).attr( 'href' ) + '&nb=1' );
			}
		} );

		// Show hidden buttons

		// Touchscreen device: use click.
		// Non-touchscreen device: use click if not already appearing due to a hover event
		$more_sharing_buttons.on( 'click', function() {
			var $more_sharing_button = $( this ),
				$more_sharing_pane = $more_sharing_button.parents( 'div:first' ).find( '.inner' );

			if ( $more_sharing_pane.is( ':animated' ) ) {
				// We're in the middle of some other event's animation
				return;
			}

			if ( true === $more_sharing_pane.data( 'justSlid' ) ) {
				// We just finished some other event's animation - don't process click event so that slow-to-react-clickers don't get confused
				return;
			}

			$sharing_email.slideUp( 200 );

			$more_sharing_pane.css( {
				left: $more_sharing_button.position().left + 'px',
				top: $more_sharing_button.position().top + $more_sharing_button.height() + 3 + 'px'
			} ).slideToggle( 200 );
		} );

		if ( document.ontouchstart === undefined ) {
			// Non-touchscreen device: use hover/mouseout with delay
			$more_sharing_buttons.hover( function() {
				var $more_sharing_button = $( this ),
					$more_sharing_pane = $more_sharing_button.parents( 'div:first' ).find( '.inner' ),
					timer;

				if ( ! $more_sharing_pane.is( ':animated' ) ) {
					// Create a timer to make the area appear if the mouse hovers for a period
					timer = setTimeout( function() {
						var handler_item_leave, handler_item_enter, handler_original_leave, handler_original_enter, close_it;

						$sharing_email.slideUp( 200 );

						$more_sharing_pane.data( 'justSlid', true );
						$more_sharing_pane.css( {
							left: $more_sharing_button.position().left + 'px',
							top: $more_sharing_button.position().top + $more_sharing_button.height() + 3 + 'px'
						} ).slideDown( 200, function() {
							// Mark the item as have being appeared by the hover
							$more_sharing_button.data( 'hasoriginal', true ).data( 'hasitem', false );

							setTimeout( function() {
								$more_sharing_pane.data( 'justSlid', false );
							}, 300 );

							if ( $more_sharing_pane.find( '.share-google-plus-1' ).size() ) {
								// The pane needs to stay open for the Google+ Button
								return;
							}

							$more_sharing_pane.mouseleave( handler_item_leave ).mouseenter( handler_item_enter );
							$more_sharing_button.mouseleave( handler_original_leave ).mouseenter( handler_original_enter );
						} );

						// The following handlers take care of the mouseenter/mouseleave for the share button and the share area - if both are left then we close the share area
						handler_item_leave = function() {
							$more_sharing_button.data( 'hasitem', false );

							if ( $more_sharing_button.data( 'hasoriginal' ) === false ) {
								var timer = setTimeout( close_it, 800 );
								$more_sharing_button.data( 'timer2', timer );
							}
						};

						handler_item_enter = function() {
							$more_sharing_button.data( 'hasitem', true );
							clearTimeout( $more_sharing_button.data( 'timer2' ) );
						};

						handler_original_leave = function() {
							$more_sharing_button.data( 'hasoriginal', false );

							if ( $more_sharing_button.data( 'hasitem' ) === false ) {
								var timer = setTimeout( close_it, 800 );
								$more_sharing_button.data( 'timer2', timer );
							}
						};

						handler_original_enter = function() {
							$more_sharing_button.data( 'hasoriginal', true );
							clearTimeout( $more_sharing_button.data( 'timer2' ) );
						};

						close_it = function() {
							$more_sharing_pane.data( 'justSlid', true );
							$more_sharing_pane.slideUp( 200, function() {
								setTimeout( function() {
									$more_sharing_pane.data( 'justSlid', false );
								}, 300 );
							} );

							// Clear all hooks
							$more_sharing_button.unbind( 'mouseleave', handler_original_leave ).unbind( 'mouseenter', handler_original_enter );
							$more_sharing_pane.unbind( 'mouseleave', handler_item_leave ).unbind( 'mouseenter', handler_item_leave );
							return false;
						};
					}, 200 );

					// Remember the timer so we can detect it on the mouseout
					$more_sharing_button.data( 'timer', timer );
				}
			}, function() {
				// Mouse out - remove any timer
				$more_sharing_buttons.each( function() {
					clearTimeout( $( this ).data( 'timer' ) );
				} );
				$more_sharing_buttons.data( 'timer', false );
			} );
		}

		$( document ).click(function() {

			// Click outside
			// remove any timer
			$more_sharing_buttons.each( function() {
				clearTimeout( $( this ).data( 'timer' ) );
			} );
			$more_sharing_buttons.data( 'timer', false );

			// slide down forcibly
			$( '.sharedaddy .inner' ).slideUp();

		});

		// Add click functionality
		$( '.sharedaddy ul' ).each( function() {

			if ( 'yep' === $( this ).data( 'has-click-events' ) ) {
				return;
			}
			$( this ).data( 'has-click-events', 'yep' );

			var printUrl = function ( uniqueId, urlToPrint ) {
				$( 'body:first' ).append( '<iframe style="position:fixed;top:100;left:100;height:1px;width:1px;border:none;" id="printFrame-' + uniqueId + '" name="printFrame-' + uniqueId + '" src="' + urlToPrint + '" onload="frames[\'printFrame-' + uniqueId + '\'].focus();frames[\'printFrame-' + uniqueId + '\'].print();"></iframe>' );
			};

			// Print button
			$( this ).find( 'a.share-print' ).click( function() {
				var ref = $( this ).attr( 'href' ),
					do_print = function() {
						if ( ref.indexOf( '#print' ) === -1 ) {
							var uid = new Date().getTime();
							printUrl( uid , ref );
						} else {
							print();
						}
					};

				// Is the button in a dropdown?
				if ( $( this ).parents( '.sharing-hidden' ).length > 0 ) {
					$( this ).parents( '.inner' ).slideUp( 0, function() {
						do_print();
					} );
				} else {
					do_print();
				}

				return false;
			} );

			// Press This button
			$( this ).find( 'a.share-press-this' ).click( function() {
				var s = '';

				if ( window.getSelection ) {
					s = window.getSelection();
				} else if( document.getSelection ) {
					s = document.getSelection();
				} else if( document.selection ) {
					s = document.selection.createRange().text;
				}

				if ( s ) {
					$( this ).attr( 'href', $( this ).attr( 'href' ) + '&sel=' + encodeURI( s ) );
				}

				if ( !window.open( $( this ).attr( 'href' ), 't', 'toolbar=0,resizable=1,scrollbars=1,status=1,width=720,height=570' ) ) {
					document.location.href = $( this ).attr( 'href' );
				}

				return false;
			} );

			// Email button
			$( 'a.share-email', this ).on( 'click', function() {
				var url = $( this ).attr( 'href' ), key;

				if ( $sharing_email.is( ':visible' ) ) {
					$sharing_email.slideUp( 200 );
				} else {
					$( '.sharedaddy .inner' ).slideUp();

					$( '#sharing_email .response' ).remove();
					$( '#sharing_email form' ).show();
					$( '#sharing_email form input[type=submit]' ).removeAttr( 'disabled' );
					$( '#sharing_email form a.sharing_cancel' ).show();

					key = '';
					if ( $( '#recaptcha_public_key' ).length > 0 ) {
						key = $( '#recaptcha_public_key' ).val();
					}

					// Update the recaptcha
					Recaptcha.create( key, 'sharing_recaptcha', { lang : sharing_js_options.lang } );

					// Show dialog
					$sharing_email.css( {
						left: $( this ).offset().left + 'px',
						top: $( this ).offset().top + $( this ).height() + 'px'
					} ).slideDown( 200 );

					// Hook up other buttons
					$( '#sharing_email a.sharing_cancel' ).unbind( 'click' ).click( function() {
						$( '#sharing_email .errors' ).hide();
						$sharing_email.slideUp( 200 );
						$( '#sharing_background' ).fadeOut();
						return false;
					} );

					// Submit validation
					$( '#sharing_email input[type=submit]' ).unbind( 'click' ).click( function() {
						var form = $( this ).parents( 'form' );

						// Disable buttons + enable loading icon
						$( this ).prop( 'disabled', true );
						form.find( 'a.sharing_cancel' ).hide();
						form.find( 'img.loading' ).show();

						$( '#sharing_email .errors' ).hide();
						$( '#sharing_email .error' ).removeClass( 'error' );

						if ( ! $( '#sharing_email input[name=source_email]' ).share_is_email() ) {
							$( '#sharing_email input[name=source_email]' ).addClass( 'error' );
						}

						if ( ! $( '#sharing_email input[name=target_email]' ).share_is_email() ) {
							$( '#sharing_email input[name=target_email]' ).addClass( 'error' );
						}

						if ( $( '#sharing_email .error' ).length === 0 ) {
							// AJAX send the form
							$.ajax( {
								url: url,
								type: 'POST',
								data: form.serialize(),
								success: function( response ) {
									form.find( 'img.loading' ).hide();

									if ( response === '1' || response === '2' || response === '3' ) {
										$( '#sharing_email .errors-' + response ).show();
										form.find( 'input[type=submit]' ).removeAttr( 'disabled' );
										form.find( 'a.sharing_cancel' ).show();
										Recaptcha.reload();
									}
									else {
										$( '#sharing_email form' ).hide();
										$sharing_email.append( response );
										$( '#sharing_email a.sharing_cancel' ).click( function() {
											$sharing_email.slideUp( 200 );
											$( '#sharing_background' ).fadeOut();
											return false;
										} );
									}
								}
							} );

							return false;
						}

						form.find( 'img.loading' ).hide();
						form.find( 'input[type=submit]' ).removeAttr( 'disabled' );
						form.find( 'a.sharing_cancel' ).show();
						$( '#sharing_email .errors-1' ).show();

						return false;
					} );
				}

				return false;
			} );
		} );

		$( 'li.share-email, li.share-custom a.sharing-anchor' ).addClass( 'share-service-visible' );
	}
})( jQuery );

// Recaptcha code
/* jshint ignore:start */
var RecaptchaTemplates={};RecaptchaTemplates.VertHtml='<table id="recaptcha_table" class="recaptchatable" > <tr> <td colspan="6" class=\'recaptcha_r1_c1\'></td> </tr> <tr> <td class=\'recaptcha_r2_c1\'></td> <td colspan="4" class=\'recaptcha_image_cell\'><div id="recaptcha_image"></div></td> <td class=\'recaptcha_r2_c2\'></td> </tr> <tr> <td rowspan="6" class=\'recaptcha_r3_c1\'></td> <td colspan="4" class=\'recaptcha_r3_c2\'></td> <td rowspan="6" class=\'recaptcha_r3_c3\'></td> </tr> <tr> <td rowspan="3" class=\'recaptcha_r4_c1\' height="49"> <div class="recaptcha_input_area"> <label for="recaptcha_response_field" class="recaptcha_input_area_text"><span id="recaptcha_instructions_image" class="recaptcha_only_if_image recaptcha_only_if_no_incorrect_sol"></span><span id="recaptcha_instructions_audio" class="recaptcha_only_if_no_incorrect_sol recaptcha_only_if_audio"></span><span id="recaptcha_instructions_error" class="recaptcha_only_if_incorrect_sol"></span></label><br/> <input name="recaptcha_response_field" id="recaptcha_response_field" type="text" /> </div> </td> <td rowspan="4" class=\'recaptcha_r4_c2\'></td> <td><a id=\'recaptcha_reload_btn\'><img id=\'recaptcha_reload\' width="25" height="17" /></a></td> <td rowspan="4" class=\'recaptcha_r4_c4\'></td> </tr> <tr> <td><a id=\'recaptcha_switch_audio_btn\' class="recaptcha_only_if_image"><img id=\'recaptcha_switch_audio\' width="25" height="16" alt="" /></a><a id=\'recaptcha_switch_img_btn\' class="recaptcha_only_if_audio"><img id=\'recaptcha_switch_img\' width="25" height="16" alt=""/></a></td> </tr> <tr> <td><a id=\'recaptcha_whatsthis_btn\'><img id=\'recaptcha_whatsthis\' width="25" height="16" /></a></td> </tr> <tr> <td class=\'recaptcha_r7_c1\'></td> <td class=\'recaptcha_r8_c1\'></td> </tr> </table> ';RecaptchaTemplates.CleanCss=".recaptchatable td img{display:block}.recaptchatable .recaptcha_image_cell center img{height:57px}.recaptchatable .recaptcha_image_cell center{height:57px}.recaptchatable .recaptcha_image_cell{background-color:white;height:57px;padding:7px!important}.recaptchatable,#recaptcha_area tr,#recaptcha_area td,#recaptcha_area th{margin:0!important;border:0!important;border-collapse:collapse!important;vertical-align:middle!important}.recaptchatable *{margin:0;padding:0;border:0;color:black;position:static;top:auto;left:auto;right:auto;bottom:auto;text-align:left!important}.recaptchatable #recaptcha_image{margin:auto;border:1px solid #dfdfdf!important}.recaptchatable a img{border:0}.recaptchatable a,.recaptchatable a:hover{-moz-outline:none;border:0!important;padding:0!important;text-decoration:none;color:blue;background:none!important;font-weight:normal}.recaptcha_input_area{position:relative!important;background:none!important}.recaptchatable label.recaptcha_input_area_text{border:1px solid #dfdfdf!important;margin:0!important;padding:0!important;position:static!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important}.recaptcha_theme_red label.recaptcha_input_area_text,.recaptcha_theme_white label.recaptcha_input_area_text{color:black!important}.recaptcha_theme_blackglass label.recaptcha_input_area_text{color:white!important}.recaptchatable #recaptcha_response_field{font-size:11pt}.recaptcha_theme_blackglass #recaptcha_response_field,.recaptcha_theme_white #recaptcha_response_field{border:1px solid gray}.recaptcha_theme_red #recaptcha_response_field{border:1px solid #cca940}.recaptcha_audio_cant_hear_link{font-size:7pt;color:black}.recaptchatable{line-height:1em;border:1px solid #dfdfdf!important}.recaptcha_error_text{color:red}";RecaptchaTemplates.CleanHtml='<table id="recaptcha_table" class="recaptchatable"> <tr height="73"> <td class=\'recaptcha_image_cell\' width="302"><center><div id="recaptcha_image"></div></center></td> <td style="padding: 10px 7px 7px 7px;"> <a id=\'recaptcha_reload_btn\'><img id=\'recaptcha_reload\' width="25" height="18" alt="" /></a> <a id=\'recaptcha_switch_audio_btn\' class="recaptcha_only_if_image"><img id=\'recaptcha_switch_audio\' width="25" height="15" alt="" /></a><a id=\'recaptcha_switch_img_btn\' class="recaptcha_only_if_audio"><img id=\'recaptcha_switch_img\' width="25" height="15" alt=""/></a> <a id=\'recaptcha_whatsthis_btn\'><img id=\'recaptcha_whatsthis\' width="25" height="16" /></a> </td> <td style="padding: 18px 7px 18px 7px;"> <img id=\'recaptcha_logo\' alt="" width="71" height="36" /> </td> </tr> <tr> <td style="padding-left: 7px;"> <div class="recaptcha_input_area" style="padding-top: 2px; padding-bottom: 7px;"> <input style="border: 1px solid #3c3c3c; width: 302px;" name="recaptcha_response_field" id="recaptcha_response_field" type="text" /> </div> </td> <td></td> <td style="padding: 4px 7px 12px 7px;"> <img id="recaptcha_tagline" width="71" height="17" /> </td> </tr> </table> ';RecaptchaTemplates.ContextHtml='<table id="recaptcha_table" class="recaptchatable"> <tr> <td colspan="6" class=\'recaptcha_r1_c1\'></td> </tr> <tr> <td class=\'recaptcha_r2_c1\'></td> <td colspan="4" class=\'recaptcha_image_cell\'><div id="recaptcha_image"></div></td> <td class=\'recaptcha_r2_c2\'></td> </tr> <tr> <td rowspan="6" class=\'recaptcha_r3_c1\'></td> <td colspan="4" class=\'recaptcha_r3_c2\'></td> <td rowspan="6" class=\'recaptcha_r3_c3\'></td> </tr> <tr> <td rowspan="3" class=\'recaptcha_r4_c1\' height="49"> <div class="recaptcha_input_area"> <label for="recaptcha_response_field" class="recaptcha_input_area_text"><span id="recaptcha_instructions_context" class="recaptcha_only_if_image recaptcha_only_if_no_incorrect_sol"></span><span id="recaptcha_instructions_audio" class="recaptcha_only_if_no_incorrect_sol recaptcha_only_if_audio"></span><span id="recaptcha_instructions_error" class="recaptcha_only_if_incorrect_sol"></span></label><br/> <input name="recaptcha_response_field" id="recaptcha_response_field" type="text" /> </div> </td> <td rowspan="4" class=\'recaptcha_r4_c2\'></td> <td><a id=\'recaptcha_reload_btn\'><img id=\'recaptcha_reload\' width="25" height="17" /></a></td> <td rowspan="4" class=\'recaptcha_r4_c4\'></td> </tr> <tr> <td><a id=\'recaptcha_switch_audio_btn\' class="recaptcha_only_if_image"><img id=\'recaptcha_switch_audio\' width="25" height="16" alt="" /></a><a id=\'recaptcha_switch_img_btn\' class="recaptcha_only_if_audio"><img id=\'recaptcha_switch_img\' width="25" height="16" alt=""/></a></td> </tr> <tr> <td><a id=\'recaptcha_whatsthis_btn\'><img id=\'recaptcha_whatsthis\' width="25" height="16" /></a></td> </tr> <tr> <td class=\'recaptcha_r7_c1\'></td> <td class=\'recaptcha_r8_c1\'></td> </tr> </table> ';RecaptchaTemplates.VertCss=".recaptchatable td img{display:block}.recaptchatable .recaptcha_r1_c1{background:url(IMGROOT/sprite.png) 0 -63px no-repeat;width:318px;height:9px}.recaptchatable .recaptcha_r2_c1{background:url(IMGROOT/sprite.png) -18px 0 no-repeat;width:9px;height:57px}.recaptchatable .recaptcha_r2_c2{background:url(IMGROOT/sprite.png) -27px 0 no-repeat;width:9px;height:57px}.recaptchatable .recaptcha_r3_c1{background:url(IMGROOT/sprite.png) 0 0 no-repeat;width:9px;height:63px}.recaptchatable .recaptcha_r3_c2{background:url(IMGROOT/sprite.png) -18px -57px no-repeat;width:300px;height:6px}.recaptchatable .recaptcha_r3_c3{background:url(IMGROOT/sprite.png) -9px 0 no-repeat;width:9px;height:63px}.recaptchatable .recaptcha_r4_c1{background:url(IMGROOT/sprite.png) -43px 0 no-repeat;width:171px;height:49px}.recaptchatable .recaptcha_r4_c2{background:url(IMGROOT/sprite.png) -36px 0 no-repeat;width:7px;height:57px}.recaptchatable .recaptcha_r4_c4{background:url(IMGROOT/sprite.png) -214px 0 no-repeat;width:97px;height:57px}.recaptchatable .recaptcha_r7_c1{background:url(IMGROOT/sprite.png) -43px -49px no-repeat;width:171px;height:8px}.recaptchatable .recaptcha_r8_c1{background:url(IMGROOT/sprite.png) -43px -49px no-repeat;width:25px;height:8px}.recaptchatable .recaptcha_image_cell center img{height:57px}.recaptchatable .recaptcha_image_cell center{height:57px}.recaptchatable .recaptcha_image_cell{background-color:white;height:57px}#recaptcha_area,#recaptcha_table{width:318px!important}.recaptchatable,#recaptcha_area tr,#recaptcha_area td,#recaptcha_area th{margin:0!important;border:0!important;padding:0!important;border-collapse:collapse!important;vertical-align:middle!important}.recaptchatable *{margin:0;padding:0;border:0;font-family:helvetica,sans-serif;font-size:8pt;color:black;position:static;top:auto;left:auto;right:auto;bottom:auto;text-align:left!important}.recaptchatable #recaptcha_image{margin:auto}.recaptchatable img{border:0!important;margin:0!important;padding:0!important}.recaptchatable a,.recaptchatable a:hover{-moz-outline:none;border:0!important;padding:0!important;text-decoration:none;color:blue;background:none!important;font-weight:normal}.recaptcha_input_area{position:relative!important;width:146px!important;height:45px!important;margin-left:20px!important;margin-right:5px!important;margin-top:4px!important;background:none!important}.recaptchatable label.recaptcha_input_area_text{margin:0!important;padding:0!important;position:static!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;background:none!important;height:auto!important;width:auto!important}.recaptcha_theme_red label.recaptcha_input_area_text,.recaptcha_theme_white label.recaptcha_input_area_text{color:black!important}.recaptcha_theme_blackglass label.recaptcha_input_area_text{color:white!important}.recaptchatable #recaptcha_response_field{width:145px!important;position:absolute!important;bottom:7px!important;padding:0!important;margin:0!important;font-size:10pt}.recaptcha_theme_blackglass #recaptcha_response_field,.recaptcha_theme_white #recaptcha_response_field{border:1px solid gray}.recaptcha_theme_red #recaptcha_response_field{border:1px solid #cca940}.recaptcha_audio_cant_hear_link{font-size:7pt;color:black}.recaptchatable{line-height:1em}#recaptcha_instructions_error{color:red!important}";var RecaptchaStr_en={visual_challenge:"Get a visual challenge",audio_challenge:"Get an audio challenge",refresh_btn:"Get a new challenge",instructions_visual:"Type the two words:",instructions_context:"Type the words in the boxes:",instructions_audio:"Type what you hear:",help_btn:"Help",play_again:"Play sound again",cant_hear_this:"Download sound as MP3",incorrect_try_again:"Incorrect. Try again."},RecaptchaStr_de={visual_challenge:"Visuelle Aufgabe generieren",audio_challenge:"Audio-Aufgabe generieren",
refresh_btn:"Neue Aufgabe generieren",instructions_visual:"Gib die 2 W\u00f6rter ein:",instructions_context:"",instructions_audio:"Gib die 8 Ziffern ein:",help_btn:"Hilfe",incorrect_try_again:"Falsch. Nochmals versuchen!"},RecaptchaStr_es={visual_challenge:"Obt\u00e9n un reto visual",audio_challenge:"Obt\u00e9n un reto audible",refresh_btn:"Obt\u00e9n un nuevo reto",instructions_visual:"Escribe las 2 palabras:",instructions_context:"",instructions_audio:"Escribe los 8 n\u00fameros:",help_btn:"Ayuda",
incorrect_try_again:"Incorrecto. Otro intento."},RecaptchaStr_fr={visual_challenge:"D\u00e9fi visuel",audio_challenge:"D\u00e9fi audio",refresh_btn:"Nouveau d\u00e9fi",instructions_visual:"Entrez les deux mots:",instructions_context:"",instructions_audio:"Entrez les huit chiffres:",help_btn:"Aide",incorrect_try_again:"Incorrect."},RecaptchaStr_nl={visual_challenge:"Test me via een afbeelding",audio_challenge:"Test me via een geluidsfragment",refresh_btn:"Nieuwe uitdaging",instructions_visual:"Type de twee woorden:",
instructions_context:"",instructions_audio:"Type de acht cijfers:",help_btn:"Help",incorrect_try_again:"Foute invoer."},RecaptchaStr_pt={visual_challenge:"Obter um desafio visual",audio_challenge:"Obter um desafio sonoro",refresh_btn:"Obter um novo desafio",instructions_visual:"Escreva as 2 palavras:",instructions_context:"",instructions_audio:"Escreva os 8 numeros:",help_btn:"Ajuda",incorrect_try_again:"Incorrecto. Tenta outra vez."},RecaptchaStr_ru={visual_challenge:"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0432\u0438\u0437\u0443\u0430\u043b\u044c\u043d\u0443\u044e \u0437\u0430\u0434\u0430\u0447\u0443",
audio_challenge:"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0437\u0432\u0443\u043a\u043e\u0432\u0443\u044e \u0437\u0430\u0434\u0430\u0447\u0443",refresh_btn:"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u043e\u0432\u0443\u044e \u0437\u0430\u0434\u0430\u0447\u0443",instructions_visual:"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0434\u0432\u0430 \u0441\u043b\u043e\u0432\u0430:",instructions_context:"",instructions_audio:"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u043e\u0441\u0435\u043c\u044c \u0447\u0438\u0441\u0435\u043b:",
help_btn:"\u041f\u043e\u043c\u043e\u0449\u044c",incorrect_try_again:"\u041d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e."},RecaptchaStr_tr={visual_challenge:"G\u00f6rsel deneme",audio_challenge:"\u0130\u015fitsel deneme",refresh_btn:"Yeni deneme",instructions_visual:"\u0130ki kelimeyi yaz\u0131n:",instructions_context:"",instructions_audio:"Sekiz numaray\u0131 yaz\u0131n:",help_btn:"Yard\u0131m (\u0130ngilizce)",incorrect_try_again:"Yanl\u0131\u015f. Bir daha deneyin."},RecaptchaStr_it=
{visual_challenge:"Modalit\u00e0 visiva",audio_challenge:"Modalit\u00e0 auditiva",refresh_btn:"Chiedi due nuove parole",instructions_visual:"Scrivi le due parole:",instructions_context:"",instructions_audio:"Trascrivi ci\u00f2 che senti:",help_btn:"Aiuto",incorrect_try_again:"Scorretto. Riprova."},RecaptchaLangMap={en:RecaptchaStr_en,de:RecaptchaStr_de,es:RecaptchaStr_es,fr:RecaptchaStr_fr,nl:RecaptchaStr_nl,pt:RecaptchaStr_pt,ru:RecaptchaStr_ru,tr:RecaptchaStr_tr,it:RecaptchaStr_it};var RecaptchaStr=RecaptchaStr_en,RecaptchaOptions,RecaptchaDefaultOptions={tabindex:0,theme:"red",callback:null,lang:"en",custom_theme_widget:null,custom_translations:null,includeContext:false},Recaptcha={widget:null,timer_id:-1,style_set:false,theme:null,type:"image",ajax_verify_cb:null,$:function(a){return typeof a=="string"?document.getElementById(a):a},create:function(a,b,c){Recaptcha.destroy();if(b)Recaptcha.widget=Recaptcha.$(b);Recaptcha._init_options(c);Recaptcha._call_challenge(a)},destroy:function(){var a=
Recaptcha.$("recaptcha_challenge_field");a&&a.parentNode.removeChild(a);Recaptcha.timer_id!=-1&&clearInterval(Recaptcha.timer_id);Recaptcha.timer_id=-1;if(a=Recaptcha.$("recaptcha_image"))a.innerHTML="";if(Recaptcha.widget){if(Recaptcha.theme!="custom")Recaptcha.widget.innerHTML="";else Recaptcha.widget.style.display="none";Recaptcha.widget=null}},focus_response_field:function(){var a=Recaptcha.$;a=a("recaptcha_response_field");a.focus()},get_challenge:function(){if(typeof RecaptchaState=="undefined")return null;
return RecaptchaState.challenge},get_response:function(){var a=Recaptcha.$;a=a("recaptcha_response_field");if(!a)return null;return a.value},ajax_verify:function(a){Recaptcha.ajax_verify_cb=a;a=Recaptcha._get_api_server()+"/ajaxverify?c="+encodeURIComponent(Recaptcha.get_challenge())+"&response="+encodeURIComponent(Recaptcha.get_response());Recaptcha._add_script(a)},_ajax_verify_callback:function(a){Recaptcha.ajax_verify_cb(a)},_get_api_server:function(){var a=window.location.protocol,b;b=typeof _RecaptchaOverrideApiServer!=
"undefined"?_RecaptchaOverrideApiServer:"www.google.com/recaptcha/api";return a+"//"+b},_call_challenge:function(a){a=Recaptcha._get_api_server()+"/challenge?k="+a+"&ajax=1&cachestop="+Math.random();if(typeof RecaptchaOptions.extra_challenge_params!="undefined")a+="&"+RecaptchaOptions.extra_challenge_params;if(RecaptchaOptions.includeContext)a+="&includeContext=1";Recaptcha._add_script(a)},_add_script:function(a){var b=document.createElement("script");b.type="text/javascript";b.src=a;Recaptcha._get_script_area().appendChild(b)},
_get_script_area:function(){var a=document.getElementsByTagName("head");return a=!a||a.length<1?document.body:a[0]},_hash_merge:function(a){var b={};for(var c in a)for(var d in a[c])b[d]=a[c][d];if(b.theme=="context")b.includeContext=true;return b},_init_options:function(a){RecaptchaOptions=Recaptcha._hash_merge([RecaptchaDefaultOptions,a||{}])},challenge_callback:function(){Recaptcha._reset_timer();RecaptchaStr=Recaptcha._hash_merge([RecaptchaStr_en,RecaptchaLangMap[RecaptchaOptions.lang]||{},RecaptchaOptions.custom_translations||
{}]);window.addEventListener&&window.addEventListener("unload",function(){Recaptcha.destroy()},false);Recaptcha._is_ie()&&window.attachEvent&&window.attachEvent("onbeforeunload",function(){});if(navigator.userAgent.indexOf("KHTML")>0){var a=document.createElement("iframe");a.src="about:blank";a.style.height="0px";a.style.width="0px";a.style.visibility="hidden";a.style.border="none";var b=document.createTextNode("This frame prevents back/forward cache problems in Safari.");a.appendChild(b);document.body.appendChild(a)}Recaptcha._finish_widget()},
_add_css:function(a){var b=document.createElement("style");b.type="text/css";if(b.styleSheet)if(navigator.appVersion.indexOf("MSIE 5")!=-1)document.write("<style type='text/css'>"+a+"</style>");else b.styleSheet.cssText=a;else if(navigator.appVersion.indexOf("MSIE 5")!=-1)document.write("<style type='text/css'>"+a+"</style>");else{a=document.createTextNode(a);b.appendChild(a)}Recaptcha._get_script_area().appendChild(b)},_set_style:function(a){if(!Recaptcha.style_set){Recaptcha.style_set=true;Recaptcha._add_css(a+
"\n\n.recaptcha_is_showing_audio .recaptcha_only_if_image,.recaptcha_isnot_showing_audio .recaptcha_only_if_audio,.recaptcha_had_incorrect_sol .recaptcha_only_if_no_incorrect_sol,.recaptcha_nothad_incorrect_sol .recaptcha_only_if_incorrect_sol{display:none !important}")}},_init_builtin_theme:function(){var a=Recaptcha.$,b=RecaptchaStr,c=RecaptchaState,d,e;c=c.server;if(c[c.length-1]=="/")c=c.substring(0,c.length-1);var f=c+"/img/"+Recaptcha.theme;if(Recaptcha.theme=="clean"){c=RecaptchaTemplates.CleanCss;
d=RecaptchaTemplates.CleanHtml;e="png"}else{if(Recaptcha.theme=="context"){c=RecaptchaTemplates.VertCss;d=RecaptchaTemplates.ContextHtml}else{c=RecaptchaTemplates.VertCss;d=RecaptchaTemplates.VertHtml}e="gif"}c=c.replace(/IMGROOT/g,f);Recaptcha._set_style(c);Recaptcha.widget.innerHTML="<div id='recaptcha_area'>"+d+"</div>";a("recaptcha_reload").src=f+"/refresh."+e;a("recaptcha_switch_audio").src=f+"/audio."+e;a("recaptcha_switch_img").src=f+"/text."+e;a("recaptcha_whatsthis").src=f+"/help."+e;if(Recaptcha.theme==
"clean"){a("recaptcha_logo").src=f+"/logo."+e;a("recaptcha_tagline").src=f+"/tagline."+e}a("recaptcha_reload").alt=b.refresh_btn;a("recaptcha_switch_audio").alt=b.audio_challenge;a("recaptcha_switch_img").alt=b.visual_challenge;a("recaptcha_whatsthis").alt=b.help_btn;a("recaptcha_reload_btn").href="javascript:Recaptcha.reload ();";a("recaptcha_reload_btn").title=b.refresh_btn;a("recaptcha_switch_audio_btn").href="javascript:Recaptcha.switch_type('audio');";a("recaptcha_switch_audio_btn").title=b.audio_challenge;
a("recaptcha_switch_img_btn").href="javascript:Recaptcha.switch_type('image');";a("recaptcha_switch_img_btn").title=b.visual_challenge;a("recaptcha_whatsthis_btn").href=Recaptcha._get_help_link();a("recaptcha_whatsthis_btn").target="_blank";a("recaptcha_whatsthis_btn").title=b.help_btn;a("recaptcha_whatsthis_btn").onclick=function(){Recaptcha.showhelp();return false};a("recaptcha_table").className="recaptchatable recaptcha_theme_"+Recaptcha.theme;a("recaptcha_instructions_image")&&a("recaptcha_instructions_image").appendChild(document.createTextNode(b.instructions_visual));
a("recaptcha_instructions_context")&&a("recaptcha_instructions_context").appendChild(document.createTextNode(b.instructions_context));a("recaptcha_instructions_audio")&&a("recaptcha_instructions_audio").appendChild(document.createTextNode(b.instructions_audio));a("recaptcha_instructions_error")&&a("recaptcha_instructions_error").appendChild(document.createTextNode(b.incorrect_try_again))},_finish_widget:function(){var a=Recaptcha.$,b=RecaptchaState,c=RecaptchaOptions,d=c.theme;switch(d){case "red":case "white":case "blackglass":case "clean":case "custom":case "context":break;
default:d="red";break}if(!Recaptcha.theme)Recaptcha.theme=d;Recaptcha.theme!="custom"?Recaptcha._init_builtin_theme():Recaptcha._set_style("");d=document.createElement("span");d.id="recaptcha_challenge_field_holder";d.style.display="none";a("recaptcha_response_field").parentNode.insertBefore(d,a("recaptcha_response_field"));a("recaptcha_response_field").setAttribute("autocomplete","off");a("recaptcha_image").style.width="300px";a("recaptcha_image").style.height="57px";Recaptcha.should_focus=false;
Recaptcha._set_challenge(b.challenge,"image");if(c.tabindex){a("recaptcha_response_field").tabIndex=c.tabindex;if(Recaptcha.theme!="custom"){a("recaptcha_whatsthis_btn").tabIndex=c.tabindex;a("recaptcha_switch_img_btn").tabIndex=c.tabindex;a("recaptcha_switch_audio_btn").tabIndex=c.tabindex;a("recaptcha_reload_btn").tabIndex=c.tabindex}}if(Recaptcha.widget)Recaptcha.widget.style.display="";c.callback&&c.callback()},switch_type:function(a){var b=Recaptcha;b.type=a;b.reload(b.type=="audio"?"a":"v")},
reload:function(a){var b=Recaptcha,c=RecaptchaState;if(typeof a=="undefined")a="r";c=c.server+"reload?c="+c.challenge+"&k="+c.site+"&reason="+a+"&type="+b.type+"&lang="+RecaptchaOptions.lang;if(RecaptchaOptions.includeContext)c+="&includeContext=1";if(typeof RecaptchaOptions.extra_challenge_params!="undefined")c+="&"+RecaptchaOptions.extra_challenge_params;if(b.type=="audio")c+=RecaptchaOptions.audio_beta_12_08?"&audio_beta_12_08=1":"&new_audio_default=1";b.should_focus=a!="t";b._add_script(c)},finish_reload:function(a,
b){RecaptchaState.is_incorrect=false;Recaptcha._set_challenge(a,b)},_set_challenge:function(a,b){var c=Recaptcha,d=RecaptchaState,e=c.$;d.challenge=a;c.type=b;e("recaptcha_challenge_field_holder").innerHTML="<input type='hidden' name='recaptcha_challenge_field' id='recaptcha_challenge_field' value='"+d.challenge+"'/>";if(b=="audio")e("recaptcha_image").innerHTML=Recaptcha.getAudioCaptchaHtml();else if(b=="image"){var f=d.server+"image?c="+d.challenge;e("recaptcha_image").innerHTML="<img style='display:block;' height='57' width='300' src='"+
f+"'/>"}Recaptcha._css_toggle("recaptcha_had_incorrect_sol","recaptcha_nothad_incorrect_sol",d.is_incorrect);Recaptcha._css_toggle("recaptcha_is_showing_audio","recaptcha_isnot_showing_audio",b=="audio");c._clear_input();c.should_focus&&c.focus_response_field();c._reset_timer()},_reset_timer:function(){var a=RecaptchaState;clearInterval(Recaptcha.timer_id);Recaptcha.timer_id=setInterval("Recaptcha.reload('t');",(a.timeout-300)*1E3)},showhelp:function(){window.open(Recaptcha._get_help_link(),"recaptcha_popup",
"width=460,height=570,location=no,menubar=no,status=no,toolbar=no,scrollbars=yes,resizable=yes")},_clear_input:function(){var a=Recaptcha.$("recaptcha_response_field");a.value=""},_displayerror:function(a){var b=Recaptcha.$;b("recaptcha_image").innerHTML="";b("recaptcha_image").appendChild(document.createTextNode(a))},reloaderror:function(a){Recaptcha._displayerror(a)},_is_ie:function(){return navigator.userAgent.indexOf("MSIE")>0&&!window.opera},_css_toggle:function(a,b,c){var d=Recaptcha.widget;
if(!d)d=document.body;var e=d.className;e=e.replace(RegExp("(^|\\s+)"+a+"(\\s+|$)")," ");e=e.replace(RegExp("(^|\\s+)"+b+"(\\s+|$)")," ");e+=" "+(c?a:b);d.className=e},_get_help_link:function(){var a=RecaptchaOptions.lang;return"http://recaptcha.net/popuphelp/"+(a=="en"?"":a+".html")},playAgain:function(){var a=Recaptcha.$;a("recaptcha_image").innerHTML=Recaptcha.getAudioCaptchaHtml()},getAudioCaptchaHtml:function(){var a=Recaptcha,b=RecaptchaState,c=b.server+"image?c="+b.challenge;if(c.indexOf("https://")==
0)c="http://"+c.substring(8);b=b.server+"/img/audiocaptcha.swf?v2";a=a._is_ie()?'<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" id="audiocaptcha" width="0" height="0" codebase="https://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab"><param name="movie" value="'+b+'" /><param name="quality" value="high" /><param name="bgcolor" value="#869ca7" /><param name="allowScriptAccess" value="always" /></object><br/>':'<embed src="'+b+'" quality="high" bgcolor="#869ca7" width="0" height="0" name="audiocaptcha" align="middle" play="true" loop="false" quality="high" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.adobe.com/go/getflashplayer"></embed> ';
c=(Recaptcha.checkFlashVer()?'<br/><a class="recaptcha_audio_cant_hear_link" href="#" onclick="Recaptcha.playAgain(); return false;">'+RecaptchaStr.play_again+"</a>":"")+'<br/><a class="recaptcha_audio_cant_hear_link" target="_blank" href="'+c+'">'+RecaptchaStr.cant_hear_this+"</a>";return a+c},gethttpwavurl:function(){var a=RecaptchaState;if(Recaptcha.type=="audio"){a=a.server+"image?c="+a.challenge;if(a.indexOf("https://")==0)a="http://"+a.substring(8);return a}return""},checkFlashVer:function(){var a=
navigator.appVersion.indexOf("MSIE")!=-1?true:false,b=navigator.appVersion.toLowerCase().indexOf("win")!=-1?true:false,c=navigator.userAgent.indexOf("Opera")!=-1?true:false,d=-1;if(navigator.plugins!=null&&navigator.plugins.length>0){if(navigator.plugins["Shockwave Flash 2.0"]||navigator.plugins["Shockwave Flash"]){a=navigator.plugins["Shockwave Flash 2.0"]?" 2.0":"";a=navigator.plugins["Shockwave Flash"+a].description;a=a.split(" ");a=a[2].split(".");d=a[0]}}else if(a&&b&&!c)try{var e=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7"),
f=e.GetVariable("$version");d=f.split(" ")[1].split(",")[0]}catch(g){}return d>=9},getlang:function(){return RecaptchaOptions.lang}};
/* jshint ignore:end */
;
