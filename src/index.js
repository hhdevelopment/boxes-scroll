import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

import angular from 'angular';

import './boxesscroll.css';
import './boxesscroll.js';

(function (ng, __) {
	'use strict';
	ng.module('app', ['boxes.scroll']).controller('AppCtrl', AppCtrl);
	function AppCtrl($http, $filter) {
		var ctrl = this;
		ctrl.selectCategory = selectCategory;
		ctrl.clearSearch = clearSearch;
		ctrl.keydown = keydown;

		ctrl.categories = [{'name': 'Family', nb: 5}, {'name': 'Works', nb: 2000}, {'name': 'Friends', nb: 20}, {'name': 'Blacklist', nb: 0}];
		ctrl.selectedCategory = null;
		ctrl.items = null;
		ctrl.height = 300;
		ctrl.search = '';

		function clearSearch() {
			ctrl.search = '';
		}

		function keydown(evt, limit) {
			var event = evt.originalEvent;
			var inc = 0;
			if (event.which === 38) { // UP
				inc = -1;
			} else if (event.which === 40) { // DOWN
				inc = 1;
			} else if (event.which === 33) { // PAGEUP
				inc = -limit;
			} else if (event.which === 34) { // PAGEDOWN
				inc = limit;
			} else if (event.which === 35) { // END
				inc = ctrl.items.length;
			} else if (event.which === 36) { // HOME
				inc = -ctrl.items.length;
			}
			if (inc !== 0) {
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();
			}
			return inc;
		}
		function selectCategory(cat) {
			ctrl.selectedCategory = cat;
			$http.get('users.json').then(function (response) {
				ctrl.items = $filter('limitTo')(response.data, cat.nb, 0);
			});
		}
	}
})(angular, _);
