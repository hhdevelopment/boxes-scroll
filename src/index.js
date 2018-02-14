import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

import angular from 'angular';

import './boxesscroll.css';
import './boxesscroll.js';

(function (ng, __) {
	'use strict';
	ng.module('app', ['boxes.scroll']).controller('AppCtrl', AppCtrl);
	function AppCtrl() {
		var ctrl = this;
		ctrl.categories = [{'name':'Directory 1', nb:5},{'name':'Directory 2', nb:20000},{'name':'Directory 3', nb:20},{'name':'Directory 4', nb:0}];
		ctrl.selectedCategory = null;
		ctrl.selectCategory = selectCategory;
		ctrl.items = null;
		ctrl.height = 300;
		
		function selectCategory(cat) {
			ctrl.selectedCategory = cat;
			ctrl.items = __.range(cat.nb);
		}
	}
})(angular, _);
