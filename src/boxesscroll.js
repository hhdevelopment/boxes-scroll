(function (ng) {
	var DEBOUNCE = 100;
	var SHOWSB_TIMEOUT = 500;
	var SCROLLBY = 1;
	var GRABBERMIN = 15;
	'use strict';
	ng.module('boxes.scroll', []).factory('boxesScrollServices', boxesScrollServices)
			  .directive('boxVscroll', BoxVscroll).directive('boxHscroll', BoxHscroll);
	var scope = {
		'total': '<',
		'max': '<',
		'showInfoDelay': '<',
		'debounce': '<',
		'allowKeynav': '<',
		'ngBegin': '=',
		'ngLimit': '='//,
//		'position':'<' // reverse ou both
	};
	/* @ngInject */
	function BoxVscroll($timeout, $interval, $compile) {
		return {
			restrict: 'EA',
			controller: BoxScrollCtrl,
			controllerAs: 'ctrl',
			scope: scope,
			link: function (scope, ngelt, attrs, ctrl) {
				ctrl.horizontal = false;
				link($timeout, $interval, $compile, scope, ngelt, attrs, ctrl);
			}
		};
	}
	/* @ngInject */
	function BoxHscroll($timeout, $interval, $compile) {
		return {
			restrict: 'EA',
			controller: BoxScrollCtrl,
			controllerAs: 'ctrl',
			scope: scope,
			link: function (scope, ngelt, attrs, ctrl) {
				ctrl.horizontal = true;
				link($timeout, $interval, $compile, scope, ngelt, attrs, ctrl);
			}
		};
	}
	/**
	 * Controller commun aux deux directives, on check si horizontal est vrai ou faux
	 * @param {type} $window
	 * @param {type} $document
	 * @param {type} $interval
	 * @param {type} $timeout
	 * @param {type} $scope
	 * @param {type} boxesScrollServices
	 * @returns {undefined}
	 */
	function BoxScrollCtrl($window, $document, $interval, $timeout, $scope, boxesScrollServices) {
		var ctrl = this;
		ctrl.reItems;
		ctrl.ngelt; // le composant lui meme
		ctrl.elt; // le composant lui meme
		ctrl.infos = null;
		ctrl.horizontal = false;

		ctrl.addEventListeners = addEventListeners; // gestion des events
		ctrl.updateInfos = updateInfos; // met a jours les infos 
		ctrl.updateTotal = updateTotal;
		ctrl.updateLimit = updateLimit;
		ctrl.updateBegin = updateBegin;
		ctrl.updateSize = updateSize;
		ctrl.getInnerLimit = getInnerLimit;

		/**
		 * Retourne la limit pour les calcul interne, cad le nombre d'items vraiment visible
		 * @returns {Number|type.ngLimit|boxesscrollL#1.BoxScrollCtrl.$scope.ngLimit}
		 */
		function getInnerLimit() {
			var items = getItems();
			var notInDeck = 0;
			if(items.length) {
				do {
					notInDeck = notInDeck + 1;
					var cont = false;
					var item = items[items.length - notInDeck];
					if(item) {
						var area = getArea(item);
						if(ctrl.horizontal) {
							cont = area.right > getEltArea().right;
						} else {
							cont = area.bottom > getEltArea().bottom;
						}
						if(!cont) notInDeck--;
					}
				} while (cont);
			} else {
				notInDeck = 1;
			}
			var fix = ($scope.ngLimit - items.length) + notInDeck;
			return $scope.max ? $scope.ngLimit : $scope.ngLimit - fix;
		}
		/**
		 * Ajoute tous les handlers
		 */
		function addEventListeners() {
			var hasFocus = false;
			ctrl.ngelt.on('wheel', function (event) {
				boxesScrollServices.execAndApplyIfScrollable($scope, this, wheel, [event]);
			});
//			ctrl.elt.addEventListener("wheel", function (event) {
//				boxesScrollServices.execAndApplyIfScrollable($scope, this, wheel, [event]);
//			}, {passive: true, capture: true});
			ctrl.ngsb.on("mouseout", function (event) {
				if (!isDragMode()) {
					hideScrollbar(SHOWSB_TIMEOUT);
				}
			});
			ctrl.ngsb.on("mousedown", function (event) { // sur le mousedown, si dans le grabber, on init le mode drag, sinon on inc/dec les pages tant que l'on est appuyé
				hasFocus = true;
				boxesScrollServices.execAndApplyIfScrollable($scope, this, mousedown, [event]);
			});
			ctrl.ngsb.on("mouseup", function (event) { // on stop l'inc/dec des pages
				mouseup();
			});
			ctrl.ngelt.on("mousemove", function (event) { // on définit la couleur du grabber
				boxesScrollServices.execAndApplyIfScrollable($scope, this, mousemove, [event]);
			});
			if (!ctrl.ngelt.css('display') !== 'none') { // si c'est une popup, le resize de l'ecran ne joue pas
				ng.element($window).on("resize", function (event) {
					updateSize();
				});
			}
			$document.on("mousedown", function (event) {
				hasFocus = ctrl.elt.contains(event.target);
			});
			$document.on("keydown", function (event) {
				if (!$scope.allowKeynav || !hasFocus || event.which < 33 || event.which > 40)
					return;
				boxesScrollServices.execAndApplyIfScrollable($scope, this, keydown, [event]);
			});
		}
		/**
		 * begin, limit ou total on changés
		 */
		var infosTimer;
		function updateInfos() {
			if (infosTimer) {
				$timeout.cancel(infosTimer);
			}
			ctrl.infos = null;
			if (!isNaN($scope.ngBegin) && !isNaN($scope.ngLimit) && !isNaN($scope.total)) {
				var from = $scope.total?$scope.ngBegin + 1:0;
				var to =  $scope.ngBegin + boxesScrollServices.minXmax(0, ctrl.getInnerLimit(), $scope.total);
				ctrl.infos = "[" + from + "-" + to + "]/" + $scope.total;
				infosTimer = $timeout(function (c) {
					c.infos = null;
				}, $scope.showInfoDelay || 1000, true, ctrl);
			}
		}
		/**
		 * Le nombre d'items a changé
		 * On repositionne le grabber en 0
		 * Si pas d'items, grabber = 100%
		 * Sinon on set limit a 1, ce qui va lancer le processus updateLimit->adjustLimit
		 */
		function updateTotal() {
			$scope.ngBegin = 0;
			moveGrabber(getGrabberOffsetPercentFromBegin($scope.ngBegin));
			adjustLimit();
			updateGrabberSizes();
			updateInfos();
		}
		/**
		 * La limit a ete mis a jour
		 */
		function updateLimit() {
			moveGrabber(getGrabberOffsetPercentFromBegin($scope.ngBegin));
			adjustLimit();
			updateGrabberSizes();
			updateInfos();
		}
		/**
		 * begin a ete mis a jour
		 */
		function updateBegin() {
			moveGrabber(getGrabberOffsetPercentFromBegin($scope.ngBegin));
			adjustLimit();
			updateGrabberSizes();
			updateInfos();
		}
		/**
		 * La fenetre a ete redimentionn�
		 */
		var resizeTimer = null;
		function updateSize() {
			if (resizeTimer) {
				$timeout.cancel(resizeTimer);
			}
			if ($scope.ngLimit > 2) {
				resizeTimer = $timeout(function (s) {
					adjustLimit();
					updateGrabberSizes();
				}, 200, true, $scope);
			} else {
				adjustLimit();
				updateGrabberSizes();
			}
		}
		/**
		 * Gere les differents rendus de la scrollbar.
		 * Si on passe au dessus du trigger
		 * Mousemove(!drag) and mouseup
		 * @param {type} event
		 * @returns {undefined}
		 */
		function manageScrollbarRender(event) {
			if (modeTimer) {
				$timeout.cancel(modeTimer);
			}
			var m = boxesScrollServices.getMousePosition(event);
			if (isTriggerOver(m)) { // la souris est au dessus du declencheur
				showScrollbar();
			}
			if (isScrollbarVisible()) {
				if (isScrollbarOver(m)) { // la souris est au dessus de la scrollbar
					showScrollbar();
					if (compareGrabberAndMousePosition(m) === 0) { // la souris est au dessus du curseur
						showScrollbar('hover');
					}
				} else {
					hideScrollbar(SHOWSB_TIMEOUT);
				}
			}
		}
		/**
		 * Gere la navigation clavier
		 * @param {type} event
		 */
		function keydown(event) {
			var inc = 0;
			if (ctrl.horizontal) {
				if (event.which === 37) { // LEFT
					inc = -1;
				} else if (event.which === 39) { // RIGHT
					inc = 1;
				}
			} else {
				var innerLimit = ctrl.getInnerLimit();
				if (event.which === 38) { // UP
					inc = -1;
				} else if (event.which === 40) { // DOWN
					inc = 1;
				} else if (event.which === 33) { // PAGEUP
					inc = -innerLimit;
				} else if (event.which === 34) { // PAGEDOWN
					inc = innerLimit;
				} else if (event.which === 35) { // END
					inc = $scope.total - $scope.ngBegin - innerLimit;
				} else if (event.which === 36) { // HOME
					inc = -$scope.ngBegin;
				}
			}
			if (inc !== 0) {
				boxesScrollServices.stopEvent(event);
				$scope.ngBegin = $scope.ngBegin + inc;
			}
		}
		/**
		 * la souris bouge au dessus de la scrollbar
		 * @param {jqEvent} event
		 */
		function mousemove(event) {
			if (!isDragMode()) {
				manageScrollbarRender(event);
			}
		}
		var downData = {timer: null, scope: null, inc: 0, end: 0};
		var offsetMouse;
		function mousedown(event) {
			var m = boxesScrollServices.getMousePosition(event);
			boxesScrollServices.stopEvent(event);
			var pos = compareGrabberAndMousePosition(m);
			if (!isNaN(pos)) { // dans la scrollbar
				if (pos === 0) { // on a click sur le curseur passage en mode drag
					offsetMouse = getOffsetMouseFromGrabber(m);
					showScrollbar('drag');
					document.addEventListener('mousemove', dragHandler, false);
					document.addEventListener("mouseup", endDrag, false);
				} else {
					var innerLimit = ctrl.getInnerLimit();
					$scope.ngBegin = $scope.ngBegin + (innerLimit * pos); // next or previous page
					downData.scope = $scope;
					downData.inc = pos; // vaut 1 ou -1
					downData.end = getBeginFromPercent(getGrabberOffsetPercentFromMousePosition(m, 0));
					if (pos < 0) {
						downData.end -= innerLimit;
					}
					downData.timer = $interval(function (data) {
						var next = data.scope.ngBegin + (innerLimit * data.inc); // next or previous page;
						if (next * data.inc > data.end * data.inc) {
							$interval.cancel(data.timer);
							return;
						}
						data.scope.ngBegin = next;
					}, 300, 0, true, downData);
				}
			}
		}
		function mouseup(event) {
			if (downData.timer) {
				$interval.cancel(downData.timer);
			}
		}
		function endDrag(event) {
			offsetMouse = 0;
			document.removeEventListener('mousemove', dragHandler);
			document.removeEventListener('mouseup', endDrag);
			boxesScrollServices.execAndApplyIfScrollable($scope, this, manageScrollbarRender, [event]); // 
		}
		function dragHandler(event) {
			boxesScrollServices.stopEvent(event);
			var m = boxesScrollServices.getMousePosition(event);
			var percent = getGrabberOffsetPercentFromMousePosition(m, offsetMouse);
			var begin = getBeginFromPercent(percent);
			if (begin <= $scope.total - ctrl.getInnerLimit()) {
				$scope.ngBegin = begin;
			}
		}
		var wheelData = {timer: null, begin: null};
		function wheel(event) {
			boxesScrollServices.stopEvent(event);
			hideScrollbar();
			wheelData.begin = manageWheelHandler(event, wheelData.begin || $scope.ngBegin);
//			moveGrabber(getGrabberOffsetPercentFromBegin(wheelData.begin));
//			if (!wheelData.timer) {
//				$scope.ngBegin = wheelData.begin;
//				wheelData.timer = $timeout(function (scope, data) {
//					scope.ngBegin = data.begin;
//					data.timer = null;
//					data.begin = null;
//				}, 60, true, $scope, wheelData);
//			}
			$scope.ngBegin = wheelData.begin;
			wheelData.begin = null;
		}
		function manageWheelHandler(event, begin) {
			var evt = event.originalEvent || event;
			return boxesScrollServices.minXmax(0, begin + ((evt.deltaY < 0) ? -SCROLLBY : SCROLLBY), $scope.total - ctrl.getInnerLimit());
		}
		function getGrabberOffsetPercentFromBegin(begin) {
			return begin * 100 / $scope.total;
		}
		function getGrabberOffsetPercentFromMousePosition(m, offset) {
			var grabberOffsetPercent;
			var rect = getTriggerArea();
			var grabberOffsetPixel;
			var onePercent;
			if (ctrl.horizontal) {
				onePercent = rect.width / 100;
				grabberOffsetPixel = m.x - rect.left - offset;
			} else {
				onePercent = rect.height / 100;
				grabberOffsetPixel = m.y - rect.top - offset;
			}
			grabberOffsetPercent = grabberOffsetPixel / onePercent;
			return boxesScrollServices.minXmax(0, grabberOffsetPercent, 100 - getGrabberSizePercentFromScopeValues());
		}
		/**
		 * Est on en mode drag&drop
		 */
		function isDragMode() {
			return ctrl.ngsb.attr('mode') === 'drag';
		}
		function isScrollbarVisible() {
			return ctrl.ngsb.attr('mode') !== 'hidden';
		}
		function showScrollbar(mode) {
			ctrl.ngsb.attr('mode', mode || null);
		}
		var modeTimer;
		function hideScrollbar(defer) {
			if (isScrollbarVisible()) {
				if (modeTimer) {
					$timeout.cancel(modeTimer);
				}
				if (defer) {
					ctrl.ngsb.attr('mode', null);
					modeTimer = $timeout(function () {
						ctrl.ngsb.attr('mode', 'hidden');
					}, defer);
				} else {
					ctrl.ngsb.attr('mode', 'hidden');
				}
			}
		}
		/**
		 * La souris est elle au dessus de la scrollbar
		 * @param {MouseCoordonates} m
		 * @returns {Boolean}
		 */
		function isScrollbarOver(m) {
			return document.elementFromPoint(m.x, m.y) === ctrl.sb;
		}
		/**
		 * 
		 * @param {MouseCoordonates} m
		 * @returns {Boolean}
		 */
		function isTriggerOver(m) {
			var result = false;
			if (document.elementFromPoint(m.x, m.y) === ctrl.elt) {
				if (ctrl.horizontal) {
					result = m.y >= getTriggerArea().top; // on est au dessus de la scrollbar trigger
				} else {
					result = m.x >= getTriggerArea().left; // on est au dessus de la scrollbar trigger
				}
			}
			return result;
		}
		/**
		 * La souris est elle avant le grabber (-1), apres le grabber (1) sur le grabber (0), pas au dessus NaN
		 * @param {type} m
		 * @returns {Number}
		 */
		function compareGrabberAndMousePosition(m) {
			if (isScrollbarOver(m)) {
				if (ctrl.horizontal) {
					var start = getScrollbarArea().left + getGrabberOffsetPixelFromPercent(getGrabberOffsetPercentFromBegin($scope.ngBegin));
					if (m.x < start)
						return -1;
					var end = start + getGrabberSizePixelFromPercent(getGrabberSizePercentFromScopeValues());
					if (m.x > end)
						return 1;
					if (m.x >= start && m.x <= end)
						return 0;
				} else {
					var start = getScrollbarArea().top + getGrabberOffsetPixelFromPercent(getGrabberOffsetPercentFromBegin($scope.ngBegin));
					if (m.y < start)
						return -1;
					var end = start + getGrabberSizePixelFromPercent(getGrabberSizePercentFromScopeValues());
					if (m.y > end)
						return 1;
					if (m.y >= start && m.y <= end)
						return 0;
				}
			}
			return NaN();
		}
		function getOffsetMouseFromGrabber(m) {
			var result = 0;
			if (ctrl.horizontal) {
				var start = getTriggerArea().left + getGrabberOffsetPixelFromPercent(getGrabberOffsetPercentFromBegin($scope.ngBegin));
				result = m.x - start;
			} else {
				var start = getTriggerArea().top + getGrabberOffsetPixelFromPercent(getGrabberOffsetPercentFromBegin($scope.ngBegin));
				result = m.y - start;
			}
			return result;
		}
		function adjustLimit() {
			if ($scope.max) {
				$scope.ngLimit = $scope.max;
			} else if ($scope.total) {
				var items = getItems(); // il y en a au moins un
				if (items.length) {
					var size = 0;
					var empty = 0;
					size = [].reduce.call(items, function (accu, item) {
						var h = ctrl.horizontal ? getArea(item).width : getArea(item).height;
						return accu + h;
					}, 0);
					var offset = getOffsetPixelContainerBeforeItem(items[0]); // on ignore les éléments avant
					empty = getHeightArea() - offset - size;
					var inc = 0;
					var average = size / items.length;
					if(average) { // protect div par 0
						var floatValue = empty / average;
						inc = floatValue < 0 ? Math.ceil(floatValue) : Math.ceil(floatValue); // on veut en voir une de plus
						if (inc === floatValue) { // on tombe pile poil, on rajoute un, pour tjs avoir un de plus
							inc++;
						}
					}
					var max = $scope.total - $scope.ngBegin;
					if (inc !== -1) { // si un depasse on laisse
						var newLimit = boxesScrollServices.minXmax(1, $scope.ngLimit + inc, max + 1);
						if (newLimit !== $scope.ngLimit) {
							$scope.ngLimit = newLimit;
						}
					}
				}
			}
		}
		function getItems() {
			var items = ctrl.ngelt.find("[ng-repeat]");
			var result = [];
			items.each(function (idx, item) {
				var ngRepeat = ng.element(item).attr('ng-repeat');
				if (ngRepeat.match(ctrl.reItems)) {
					result.push(item);
				}
			});
			return result;
		}
		/**
		 * Calcul la taille des grabbers 
		 */
		function updateGrabberSizes() {
			var bgSizeElt = ctrl.ngelt.css('background-size');
			var bgSizeSb = ctrl.ngsb.css('background-size');

			var grabbersizePixel = getGrabberSizePixelFromPercent(getGrabberSizePercentFromScopeValues());

			if (ctrl.horizontal) {
				bgSizeElt = bgSizeElt.replace(/.*\s+/, grabbersizePixel + 'px ');
				bgSizeSb = bgSizeSb.replace(/.*\s+/, grabbersizePixel + 'px ');
			} else {
				bgSizeElt = bgSizeElt.replace(/px\s+\d+(\.\d+)*.*/, 'px ' + grabbersizePixel + 'px');
				bgSizeSb = bgSizeSb.replace(/px\s+\d+(\.\d+)*.*/, 'px ' + grabbersizePixel + 'px');
			}
			ctrl.ngelt.css({'background-size': bgSizeElt});
			ctrl.ngsb.css({'background-size': bgSizeSb});
		}
		/**
		 * Corrige et déplace le curseur
		 * @param {number} percent
		 */
		function moveGrabber(percent) {
			var offset = 0;
			if (percent && $scope.total) {
				var grabberSizePercent = getGrabberSizePercentFromScopeValues();
				var grabberOffsetPercent = boxesScrollServices.minXmax(0, percent, 100 - grabberSizePercent);
				var offset = getGrabberOffsetPixelFromPercent(grabberOffsetPercent);
				var grabberSize = getGrabberSizePixelFromPercent(grabberSizePercent);
				if (offset >= getHeightArea() - grabberSize) {
					offset = getHeightArea() - grabberSize;
				}
			}
			if (ctrl.horizontal) {
				ctrl.ngelt.css({'background-position': offset + 'px bottom'});
				ctrl.ngsb.css({'background-position': offset + 'px bottom'});
			} else {
				ctrl.ngelt.css({'background-position': 'right ' + offset + 'px'});
				ctrl.ngsb.css({'background-position': 'right ' + offset + 'px'});
			}
		}
		/**
		 * Calcul ngBegin à partir de la position du curseur
		 * @param {number} percent : la position en % du curseur, son offset
		 */
		function getBeginFromPercent(percent) {
			return Math.round(percent * $scope.total / 100);
		}
		/**
		 * Calcul la position du curseur en px
		 * @param {type} percentOffset
		 * @returns {Number}
		 */
		function getGrabberOffsetPixelFromPercent(percentOffset) {
			var sbLenght = getHeightArea(); // Longueur de la scrollbar
			var grabberOffsetPixel = sbLenght * percentOffset / 100;
			return Math.max(grabberOffsetPixel, 0);
		}
		/**
		 * Retourne la taille en pourcent du grabber en fonction de ngLimit et total
		 * @returns {Number}
		 */
		function getGrabberSizePercentFromScopeValues() {
			if ($scope.total) {
				return Math.min((($scope.max || ctrl.getInnerLimit()) / $scope.total) * 100, 100);
			}
			return 100;
		}
		/**
		 * Calcul la hauteur du grabber
		 * @param {type} percentSize
		 * @returns {Number}
		 */
		function getGrabberSizePixelFromPercent(percentSize) {
			return Math.max(getHeightArea() * percentSize / 100, GRABBERMIN);
		}
		/**
		 * Retourne l'ffset en pixel avant l'item
		 * Typiquement la taille du header dans un tableau 
		 * @param {HtmlElement} item
		 * @returns {number}
		 */
		function getOffsetPixelContainerBeforeItem(item) {
			if (ctrl.horizontal) {
				return getArea(item).left - getEltArea().left;
			} else {
				return getArea(item).top - getEltArea().top;
			}
		}
		/**
		 * Retourne la hauteur utile 
		 * @returns {number}
		 */
		function getHeightArea() {
			return ctrl.horizontal ? getEltArea().width : getEltArea().height;
		}
		/**
		 * Retourne la zone correspondante à l'indicateur de position de la scrollbar, permet aussi de faire apparaitre la scrollbar au survol
		 * @return {Rectangle}
		 */
		function getTriggerArea() {
			var clientRect = ctrl.elt.getClientRects();
			if (clientRect && clientRect.length) {
				var rect = clientRect[0];
				if (rect) {
					// zone de la scrollbar
					var bgSize = ctrl.ngelt.css('background-size');
					if (ctrl.horizontal) {
						var m = bgSize.match(/\D*\d+\D*(\d+)\D*/);
						var s = m.length > 0 ? parseInt(m[1]) : 4;
						return {
							left: rect.left, right: rect.right,
							width: rect.width, height: s,
							top: rect.bottom - s, bottom: rect.bottom
						};
					} else {
						var m = bgSize.match(/\D*(\d+)\D*\d+\D*/);
						var s = m.length > 0 ? parseInt(m[1]) : 4;
						return {
							left: rect.right - s, right: rect.right,
							width: s, height: rect.height,
							top: rect.top, bottom: rect.bottom
						};
					}
				}
			}
			return getNullArea();
		}
		/**
		 * Retourne la zone correspondante à la scrollbar
		 * @return {Rectangle}
		 */
		function getScrollbarArea() {
			return getArea(ctrl.sb);
		}
		/**
		 * Retourne la zone correspondante à la directive
		 * @return {Rectangle}
		 */
		function getEltArea() {
			return getArea(ctrl.elt);
		}
		/**
		 * Retourne la zone correspondante à l'element html en argument
		 * @param {HTMLElement} elt
		 * @return {Rectangle}
		 */
		function getArea(elt) {
			var clientRect = elt.getClientRects();
			if (clientRect && clientRect.length) {
				var rect = clientRect[0];
				if (rect) {
					return rect;
				}
			}
			return getNullArea();
		}
		/**
		 * Retourne un rectangle de valeurs 0
		 * @return {Rectangle}
		 */
		function getNullArea() {
			return {left: 0, right: 0, width: 0, height: 0, top: 0, bottom: 0};
		}
	}
	/**
	 * A partir d'un element jquery retourne l'element HTML
	 * @param {jqElement} ngelt
	 * @returns {HTMLElement}
	 */
	function getHtmlElement(ngelt) {
		return ngelt.get ? ngelt.get(0) : ngelt[0];
	}
	/**
	 * Fonction de link de la directive, indépendant du sens du scroll
	 * @param {type} $timeout
	 * @param {type} $interval
	 * @param {type} $compile
	 * @param {type} scope
	 * @param {type} ngelt
	 * @param {type} attrs
	 * @param {type} ctrl
	 */
	function link($timeout, $interval, $compile, scope, ngelt, attrs, ctrl) {
		ctrl.reItems = new RegExp("\s?limitTo\s?\:\s?" + attrs.ngLimit + "\s?\:\s?" + attrs.ngBegin + ""); // pour déterminer quel items sont gerer
		scope.ngBegin = 0;
		scope.ngLimit = 1;
		ctrl.ngelt = ngelt; // on sauve l'element jquery
		ctrl.elt = getHtmlElement(ngelt); // on sauve l'element
		ctrl.ngsb = $compile("<span mode='hidden' class='scrollbar')></span>")(scope);
		var info = $compile("<span ng-show='ctrl.infos' class='infos-scrolling' ng-bind='ctrl.infos'></span>")(scope);
		ngelt.append(info);
		ngelt.append(ctrl.ngsb);
		ctrl.sb = getHtmlElement(ctrl.ngsb);
		var watcherClears = [];
		if (ngelt.css('display') === 'none') { // si c'est une popup, on surveille le display 
			var previous = {value: 'none'};
			$interval(function (prev, s) {
				var d = ctrl.ngelt.css('display');
				if (d !== prev.value) {
					updateDisplay(d, prev.value, s);
					prev.value = d;
				}
			}, 100, 0, true, previous, scope);
//			watcherClears.push(scope.$watch(function (scope) {
//				console.log("read display");
//				return ctrl.ngelt.css('display');
//			}, updateDisplay));
		}
		if (ctrl.horizontal) {
			watcherClears.push(scope.$watch(function (scope) {
				return scope.ctrl.ngelt.width();
			}, function (v1, v2, s) {
				s.ctrl.updateSize();
			}));
		} else {
			watcherClears.push(scope.$watch(function (scope) {
				return scope.ctrl.ngelt.height();
			}, function (v1, v2, s) {
				s.ctrl.updateSize();
			}));
		}
		watcherClears.push(scope.$watch('total', function (v1, v2, s) {
			if (v1 !== v2) {
				$timeout(s.ctrl.updateTotal, s.debounce || DEBOUNCE, true);
			}
		}));
		watcherClears.push(scope.$watch('ngLimit', function (v1, v2, s) {
			if (v1 !== v2) {
				$timeout(s.ctrl.updateLimit, s.debounce || DEBOUNCE, true);
			}
		}));
		watcherClears.push(scope.$watch('ngBegin', function (v1, v2, s) {
			if (v1 >= 0 && v1 <= s.total - s.ctrl.getInnerLimit()) {
				$timeout(s.ctrl.updateBegin, s.debounce || DEBOUNCE, true);
			} else if (v1 < 0) {
				s.ngBegin = 0;
			} else {
				s.ngBegin = Math.max(s.total - s.ctrl.getInnerLimit(), 0);
			}
		}));
		scope.$on('$destroy', function () {
			watcherClears.forEach(function (watcherClear) {
				watcherClear();
			});
		});
		ctrl.addEventListeners();
		function updateDisplay(v1, v2, s) {
			if (v1 !== 'none') {
				if (scope.max) {
					s.ngLimit = s.max;
					s.ctrl.updateTotal();
				} else {
					s.ngLimit = 1;
					s.ctrl.updateSize();
				}
			}
		}
	}
	function boxesScrollServices() {
		return {
			execAndApplyIfScrollable: execAndApplyIfScrollable,
			minXmax: minXmax,
			getMousePosition: getMousePosition,
			stopEvent: stopEvent
		};
		function minXmax(min, x, max) {
			return Math.min(Math.max(min, x), max);

		}
		/**
		 * Execute func.apply(obj, data) uniquement si on peut scroller
		 * @param {type} scope
		 * @param {Object} obj
		 * @param {type} func
		 * @param {array} data
		 * @returns {undefined}
		 */
		function execAndApplyIfScrollable(scope, obj, func, data) {
			if (scope.ctrl.getInnerLimit() < scope.total) {
				scope.$apply(function () {
					func.apply(obj, data);
				});
			}
		}
		/**
		 * Position de la souris
		 * @param {type} event
		 * @returns {x,y}
		 */
		function getMousePosition(event) {
			return {x: event.clientX, y: event.clientY};
		}
		function stopEvent(event) {
			event.stopImmediatePropagation();
			event.stopPropagation();
			event.preventDefault();
		}
	}
})(angular);