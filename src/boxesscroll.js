(function (ng) {
	var DEBOUNCE = 100;
	var SHOWSB_TIMEOUT = 500;
	var SCROLLBY = 2;
	'use strict';
	ng.module('boxes.scroll', []).directive('boxVscroll', BoxVscroll).factory('boxesScrollServices', boxesScrollServices); //.directive('boxHscroll', BoxHscroll);
	/* @ngInject */
	function BoxVscroll($timeout, $compile, boxesScrollServices) {
		return {
			restrict: 'EA',
			controller: BoxVscrollCtrl,
			controllerAs: 'ctrl',
			scope: {
				'total': '<',
				'max': '<',
				'showInfoDelay': '<',
				'debounce': '<',
				'ngBegin': '=',
				'ngLimit': '='
			}, link: function (scope, ngelt, attrs, ctrl) {
				link($timeout, $compile, boxesScrollServices, scope, ngelt, attrs, ctrl);
			}
		};
	}
	function BoxVscrollCtrl($window, $timeout, $scope, boxesScrollServices) {
		var ctrl = this;
		ctrl.reItems;
		ctrl.ngelt; // le composant lui meme
		ctrl.elt; // le composant lui meme
		ctrl.grabberOffsetPercent = 0; // position en % du curseur 
		ctrl.infos = null;

		ctrl.addEventListeners = addEventListeners; // gestion des events
		ctrl.updateInfos = updateInfos; // met a jours les infos 
		ctrl.updateTotal = updateTotal;
		ctrl.updateLimit = updateLimit;
		ctrl.updateBegin = updateBegin;
		ctrl.updateSize = updateSize;

		/**
		 * Ajoute tous les handlers
		 */
		function addEventListeners() {
			ctrl.elt.addEventListener("wheel", wheel, {passive: true});
			ctrl.ngsb.on("click", function (event) {
				boxesScrollServices.execAndApplyIfScrollable(click, $scope, event);
			});
			ctrl.ngsb.on("mouseout", function (event) {
				if (!isDragMode()) {
					hideScrollbar(SHOWSB_TIMEOUT);
				}
			});
			ctrl.ngsb.on("mousedown", function (event) { // sur le mousedown, si dans le drabber, on init le mode drag
				boxesScrollServices.execAndApplyIfScrollable(mousedown, $scope, event);
			});
			ctrl.ngelt.on("mousemove", function (event) { // on définit la couleur du grabber
				boxesScrollServices.execAndApplyIfScrollable(mousemove, $scope, event);
			});
			ng.element($window).on("resize", function (event) {
				updateSize();
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
				ctrl.infos = "[" + Math.ceil($scope.ngBegin + 1) + "-" + Math.ceil($scope.ngBegin + Math.min($scope.ngLimit, $scope.total)) + "]/" + $scope.total;
				infosTimer = $timeout(function (c) {
					c.infos = null;
				}, $scope.showInfoDelay || 1000, true, ctrl);
			}
		}
		/**
		 * Le nombre d'items a changé
		 * On repositionne le grabber en 0
		 * Si pas d'items, grabber = 100%
		 * Sinon on set limit a 1, ce qui va lancer le processus updateLimit->initLimit
		 */
		function updateTotal() {
			$scope.ngBegin = 0;
			moveGrabber(0);
			if (!$scope.total) {
				computeAndUpdateGrabberSizes();
				return;
			}
			$scope.ngLimit = 1;
		}
		/**
		 * La limit a ete mis a jour
		 */
		function updateLimit() {
			if ($scope.ngLimit === 1) {
				initLimit();
			} else {
				adjustLimit();
			}
			computeAndUpdateGrabberSizes();
			moveGrabber(getGrabberOffsetPercentFromBeginAndLimit($scope.ngBegin, $scope.ngLimit));
		}
		/**
		 * begin a ete mis a jour
		 */
		function updateBegin() {
			moveGrabber(getGrabberOffsetPercentFromBeginAndLimit($scope.ngBegin, $scope.ngLimit));
		}
		/**
		 * La fenetre a ete redimentionn�
		 */
		var resizeTimer = null;
		function updateSize() {
			if (resizeTimer) {
				$timeout.cancel(resizeTimer);
			}
			if ($scope.ngLimit > 1) {
				resizeTimer = $timeout(function (s) {
					initLimit();
				}, 200, true, $scope);
			} else {
				initLimit();
			}
		}
		function getTriggerArea() {
			var clientRect = ctrl.elt.getClientRects();
			if (clientRect && clientRect.length) {
				var rect = clientRect[0];
				if (rect) {
					// zone de la scrollbar
					var bgSize = ctrl.ngelt.css('background-size');
					var m = bgSize.match(/\D*(\d+)\D*\d+\D*/);
					var s = m.length > 0 ? parseInt(m[1]) : 12;
					return {
						x: rect.right - s, y: rect.top,
						left: rect.right - s, right: rect.right,
						width: s, height: rect.height,
						top: rect.top, bottom: rect.bottom
					};
				}
			}
			return getNullArea();
		}
		function getScrollbarArea() {
			return getArea(ctrl.sb);
		}
		function getEltArea() {
			return getArea(ctrl.elt);
		}
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
		function getNullArea() {
			return {x: 0, y: 0, left: 0, right: 0, width: 0, height: 0, top: 0, bottom: 0};
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
			var m = getMousePosition(event);
			if (isTriggerOver(m.x, m.y)) { // la souris est au dessus du declencheur
				showScrollbar();
			}
			if (isScrollbarVisible()) {
				if (isScrollbarOver(m.x, m.y)) { // la souris est au dessus de la scrollbar
					if (isGrabberOver(m.x, m.y)) { // la souris est au dessus du curseur
						showScrollbar('hover');
					}
				} else {
					hideScrollbar(SHOWSB_TIMEOUT);
				}
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
		var offsetMouse;
		function mousedown(event) {
			var m = getMousePosition(event);
			if (isGrabberOver(m.x, m.y)) { // on a click sur le curseur
				stopEvent(event);
				offsetMouse = getOffsetMouseFromGrabber(m);
				showScrollbar('drag');
				document.addEventListener('mousemove', startDrag, false);
				document.addEventListener("mouseup", endDrag, false);
			}
		}
		function endDrag(event) {
			document.removeEventListener('mousemove', startDrag);
			document.removeEventListener('mouseup', endDrag);
			boxesScrollServices.execAndApplyIfScrollable(manageScrollbarRender, $scope, event); // 
		}
		var mouseData = {timer: null, begin: 0};
		function startDrag(event) {
			stopEvent(event);
			var m = getMousePosition(event);
			var percent = getGrabberOffsetPercentFromMousePosition(m, offsetMouse);
			var begin = computeBeginFromCursor(percent);
			if (begin <= $scope.total - $scope.ngLimit) {
				$scope.ngBegin = begin;
//				mouseData.begin = begin;
//				moveGrabber(percent);
//				if (!mouseData.timer) {
//					mouseData.timer = $timeout(function (scope, data) {
//						scope.ngBegin = mouseData.begin;
//						data.timer = null;
//					}, 60, true, $scope, mouseData);
//				}
			}
		}
		function click(event) {
			stopEvent(event);
			var m = getMousePosition(event);
			if (!isGrabberOver(m.x, m.y)) { // on n'a pas clické dans le grabber
				moveGrabber(getGrabberOffsetPercentFromMousePosition(m, getGrabberSizePixelFromPercent($scope.ngLimit)));
				$scope.ngBegin = Math.round(computeBeginFromCursor(ctrl.grabberOffsetPercent));
			}
		}
		var wheelData = {timer: null, begin: null};
		function wheel(event) {
			hideScrollbar();
			wheelData.begin = manageWheelHandler(event, wheelData.begin || $scope.ngBegin);
			moveGrabber(getGrabberOffsetPercentFromBeginAndLimit(wheelData.begin, $scope.ngLimit));
			if (!wheelData.timer) {
				$scope.$apply(function () {
					$scope.ngBegin = wheelData.begin;
				});
				wheelData.timer = $timeout(function (scope, data) {
					scope.ngBegin = data.begin;
					data.timer = null;
				}, 100, true, $scope, wheelData);
			}
		}
		function manageWheelHandler(event, begin) {
			var evt = event.originalEvent || event;
			if (evt.deltaY < 0 && begin > 0) {
				begin = Math.max(begin - SCROLLBY, 0);
			} else if (evt.deltaY >= 0 && begin + $scope.ngLimit < $scope.total) {
				begin = Math.min(begin + SCROLLBY, $scope.total - $scope.ngLimit);
			}
			return begin;
		}
		function getGrabberOffsetPercentFromBeginAndLimit(begin, limit) {
			var d = 0; //(limit * 100) / $scope.total;
			return (begin * (100 + d)) / $scope.total;
		}
		function getGrabberOffsetPercentFromMousePosition(m, offset) {
			var grabberOffsetPercent;
			var rect = getTriggerArea();
			var grabberOffsetPixel;
			var onePercent;
			onePercent = rect.height / 100;
			grabberOffsetPixel = m.y - rect.top - offset;
			grabberOffsetPercent = grabberOffsetPixel / onePercent;
			return Math.min(Math.max(grabberOffsetPercent, 0), 100 - getGrabberSizePercentFromScopeValues());
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
			if (ctrl.ngsb.attr('mode') === 'hidden')
				return;
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
		/**
		 * La souris est elle au dessus de la scrollbar
		 * @param {type} x
		 * @param {type} y
		 * @returns {Boolean}
		 */
		function isScrollbarOver(x, y) {
			var element = document.elementFromPoint(x, y);
			return element && element === ctrl.sb;
		}
		function isTriggerOver(x, y) {
			var result = false;
			var element = document.elementFromPoint(x, y);
			if (element && element === ctrl.elt) {
				result = x >= getTriggerArea().x; // on est au dessus de la scrollbar trigger
			}
			return result;
		}
		/**
		 * La souris est elle au dessus du grabber
		 * @param {type} x
		 * @param {type} y
		 * @returns {Boolean}
		 */
		function isGrabberOver(x, y) {
			var result = false;
			if (isScrollbarOver(x, y)) {
				var start = getScrollbarArea().y + getGrabberOffsetPixel(ctrl.grabberOffsetPercent);
				var end = start + getGrabberSizePixelFromPercent(getGrabberSizePercentFromScopeValues());
				result = y >= start && y <= end;
			}
			return result;
		}
		function getOffsetMouseFromGrabber(m) {
			var result = 0;
			var start = getTriggerArea().y + getGrabberOffsetPixel(ctrl.grabberOffsetPercent);
			result = m.y - start;
			return result;
		}
		var added = false;
		function initLimit() {
			added = false;
			var items = getItems();
			if (items.length) {
				var rects = items[items.length - 1].getClientRects();
				if (rects && rects.length) {
					$scope.ngLimit = $scope.max || Math.floor(getEltArea().height / rects[0].height);
				}
			}
		}
		function adjustLimit() {
			if (!$scope.max && $scope.total) {
				var element = document.elementFromPoint(getEltArea().left + 1, getEltArea().bottom - 1);
				if (!element) {
					return;
				}
				// on teste si l'element est enfant du composant
				if (element.nodeName !== 'BOX-VSCROLL' && !element.hasAttribute('box-vscroll') && ctrl.elt.contains(element)) { // item en bas du tableau
					$scope.ngLimit = Math.max($scope.ngLimit - 1, 0); // pas possible
				} else if (!added) { // pas d'item et on n'en a pas encore ajouté
					added = true;
					var items = getItems();
					if (items.length) {
						var size = 0;
						var empty = 0;
						size = [].reduce.call(items, function (accu, item) {
							return accu + item.getClientRects()[0].height;
						}, 0);
						empty = getEltArea().height - size;
						var average = Math.floor(size / items.length);
						var inc = Math.floor(empty / average);
						$scope.ngLimit += inc;
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
		 * Calcul la taille du grabber 
		 */
		function computeAndUpdateGrabberSizes() {
			var grabberSizePercent = getGrabberSizePercentFromScopeValues();
			var bgSize = ctrl.ngelt.css('background-size');
			var grabbersizePixel = getGrabberSizePixelFromPercent(grabberSizePercent);
			bgSize = bgSize.replace(/px\s+\d+(\.\d+)*.*/, 'px ' + grabbersizePixel + 'px');
			ctrl.ngelt.css({'background-size': bgSize});
			bgSize = ctrl.ngsb.css('background-size');
			bgSize = bgSize.replace(/px\s+\d+(\.\d+)*.*/, 'px ' + grabbersizePixel + 'px');
			ctrl.ngsb.css({'background-size': bgSize});
			ctrl.grabberSizePercent = grabberSizePercent;
		}
		/**
		 * Corrige et déplace le curseur
		 * @param {number} percent
		 */
		function moveGrabber(percent) {
			var grabberOffsetPercent = Math.min(Math.max(percent, 0), 100 - ($scope.ngLimit * 100 / $scope.total));
			var offset = getGrabberOffsetPixel(grabberOffsetPercent);
			ctrl.ngelt.css({'background-position': 'right ' + offset + 'px'});
			ctrl.ngsb.css({'background-position': 'right ' + offset + 'px'});
			ctrl.grabberOffsetPercent = grabberOffsetPercent;
		}
		/**
		 * Calcul ngBegin à partir de la position du curseur
		 * @param {number} grabberOffsetPercent : la position en % du curseur
		 */
		function computeBeginFromCursor(grabberOffsetPercent) {
			return Math.floor(grabberOffsetPercent * $scope.total / 100);
		}
		/**
		 * Calcul la position du curseur en px
		 * @param {type} percentOffset
		 * @returns {Number}
		 */
		function getGrabberOffsetPixel(percentOffset) {
			var sbLenght = getTriggerArea().height; // Longueur de la scrollbar
			var grabberOffsetPixel = sbLenght * percentOffset / 100;
			return Math.max(grabberOffsetPixel, 0);
		}
		function getGrabberSizePercentFromScopeValues() {
			return Math.min(($scope.ngLimit / $scope.total) * 100, 100);
		}
		/**
		 * Calcul la hauteur du grabber
		 * @param {type} percentSize
		 * @returns {Number}
		 */
		function getGrabberSizePixelFromPercent(percentSize) {
			return Math.max(getTriggerArea().height * percentSize / 100, 20);
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
	function getHtmlElement(ngelt) {
		return ngelt.get ? ngelt.get(0) : ngelt[0];
	}
	/**
	 * Fonction de link de la directive, indépendant du sens du scroll
	 * @param {type} $timeout
	 * @param {type} $compile
	 * @param {type} boxesScrollServices
	 * @param {type} scope
	 * @param {type} ngelt
	 * @param {type} attrs
	 * @param {type} ctrl
	 * @returns {undefined}
	 */
	function link($timeout, $compile, boxesScrollServices, scope, ngelt, attrs, ctrl) {
		ctrl.reItems = new RegExp("\s?limitTo\s?\:\s?" + attrs.ngLimit + "\s?\:\s?" + attrs.ngBegin + ""); // pour déterminer quel items sont gerer
		scope.ngBegin = 0;
		scope.ngLimit = 0;
		ctrl.ngelt = ngelt; // on sauve l'element jquery
		ctrl.elt = getHtmlElement(ngelt); // on sauve l'element
		var scrollbar = $compile("<span mode='hidden' class='scrollbar')></span>")(scope);
		ctrl.ngsb = scrollbar;
		ctrl.sb = getHtmlElement(scrollbar);
		var info = $compile("<span ng-show='ctrl.infos' class='infos-crolling' ng-bind='ctrl.infos'></span>")(scope);
		ngelt.append(info);
		ngelt.append(scrollbar);
		var pos = ctrl.ngelt.css('position');
		if (pos === 'static') { // repositionne le badge d'info
			ctrl.ngelt.css('position', 'inherit');
		}
		var watcherClears = [];
		if (ngelt.css('display') === 'none') { // si c'est une popup, on surveille le display 
			watcherClears.push(scope.$watch(function (scope) {
				return scope.ctrl.ngelt.css('display');
			}, function (v1, v2, s) {
				if (v1 !== 'none') {
					s.ngLimit = 1;
					s.ctrl.updateSize();
				} else {
					s.ngLimit = 0;
				}
			}));
		}
		watcherClears.push(scope.$watch(function (scope) {
			return scope.ctrl.ngelt.height();
		}, function (v1, v2, s) {
			s.ctrl.updateSize();
		}));
		watcherClears.push(scope.$watch('total', function (v1, v2, s) {
			s.ctrl.updateTotal();
			s.ctrl.updateInfos();
		}));
		watcherClears.push(scope.$watch('ngLimit', function (v1, v2, s) {
			$timeout(s.ctrl.updateLimit, s.debounce || DEBOUNCE, true);
			s.ctrl.updateInfos();
		}));
		watcherClears.push(scope.$watch('ngBegin', function (v1, v2, s) {
			if (v1 >= 0 && v1 <= s.total - s.ngLimit) {
				if (Math.abs(v1 - v2) !== SCROLLBY) {
					$timeout(s.ctrl.updateBegin, s.debounce || DEBOUNCE, true);
				}
			} else if (v1 < 0) {
				s.ngBegin = 0;
			} else {
				s.ngBegin = Math.max(s.total - s.ngLimit, 0);
			}
			s.ctrl.updateInfos();
		}));
		scope.$on('$destroy', function () {
			watcherClears.forEach(function (watcherClear) {
				watcherClear();
			});
		});
		ctrl.addEventListeners();
	}
	function boxesScrollServices() {
		return {
			execAndApplyIfScrollable: execAndApplyIfScrollable
		};
		/**
		 * Execute func uniquement si on peut scroller
		 * @param {type} func
		 * @param {type} scope
		 * @param {type} event
		 * @returns {undefined}
		 */
		function execAndApplyIfScrollable(func, scope, event) {
			scope.$apply(function () {
				if (scope.ngLimit < scope.total) {
					func.call(this, event);
				}
			});
		}

	}
})(angular);