/* global _ */
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

import angular from 'angular';

import './boxesscroll.css';
import './boxesscroll.js';

(function (ng, __) {
	'use strict';
	ng.module('app', ['boxes.scroll']).config(appConfig).controller('AppController', AppController);
	/* @ngInject */
	function appConfig($compileProvider) {
		// disable debug info
//		$compileProvider.debugInfoEnabled(false);
	}
	function AppController($rootScope, $http, $filter) {
		var ctrl = this;
		ctrl.selectCategory = selectCategory;
		ctrl.search = search;
		ctrl.keydown = keydown;
		ctrl.countWatchers = countWatchers;
		ctrl.switchMode = switchMode;

		ctrl.categories = [
			{'name': 'All', nb: 10000, skip:0}, 
			{'name': 'Unclassified', nb: 200, skip:200}, 
			{'name': 'Family', nb: 5, skip:5}, 
			{'name': 'Works', nb: 2000, skip:2000}, 
			{'name': 'Friends', nb: 20, skip:20}, 
			{'name': 'Others', nb: 3, skip:3}, 
			{'name': 'Blacklist', nb: 0, skip:0}
		];
		ctrl.selectedCategory = null;
		ctrl.response = null;
		ctrl.items = [];
		ctrl.filteredItems = [];
		ctrl.height = 240;
		ctrl.nbWatchers = '?';
		ctrl.key = null;
		
		function search(search) {
			ctrl.key = search;
			if(search) {
				ctrl.filteredItems = $filter('filter')(ctrl.items, search);
			} else {
				ctrl.filteredItems = ctrl.items;
			} 
		}
		function switchMode(){
			ctrl.nbWatchers = '?';
		}
		function countWatchers() {
			var root = $rootScope;
			var count = root.$$watchers ? root.$$watchers.length : 0;
			var pendingChildHeads = [root.$$childHead];
			var currentScope;
			while (pendingChildHeads.length) {
				currentScope = pendingChildHeads.shift();
				while (currentScope) {
					count += currentScope.$$watchers ? currentScope.$$watchers.length : 0;
					pendingChildHeads.push(currentScope.$$childHead);
					currentScope = currentScope.$$nextSibling;
				}
			}
			ctrl.nbWatchers = count;
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
			ctrl.key = null;
			if(!ctrl.response) {
				$http.get('users.json').then(function (response) {
					ctrl.response = response.data;
					ctrl.items = $filter('limitTo')(ctrl.response, cat.nb, cat.skip);
					ctrl.filteredItems = ctrl.items;
				});
			} else {
				ctrl.items = $filter('limitTo')(ctrl.response, cat.nb, cat.skip);
				ctrl.filteredItems = ctrl.items;
			}
		}
	}
})(angular, _);
