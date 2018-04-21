/* global _ */
import './hhfrancois.png';
import 'bootstrap/dist/css/bootstrap.css';
//import 'bootswatch/cerulean/bootstrap.css';
//import 'bootswatch/cosmo/bootstrap.css';
//import 'bootswatch/cyborg/bootstrap.css';
//import 'bootswatch/darkly/bootstrap.css';
//import	'bootswatch/flatly/bootstrap.css';
//import 'bootswatch/journal/bootstrap.css';
//import 'bootswatch/lumen/bootstrap.css';
//import 'bootswatch/paper/bootstrap.css';
//import 'bootswatch/readable/bootstrap.css';
//import 'bootswatch/sandstone/bootstrap.css';
//import 'bootswatch/simplex/bootstrap.css';
//import 'bootswatch/slate/bootstrap.css';
//import 'bootswatch/spacelab/bootstrap.css';
//import 'bootswatch/superhero/bootstrap.css';
//import 'bootswatch/united/bootstrap.css';
//import 'bootswatch/yeti/bootstrap.css';

import 'bootstrap/dist/js/bootstrap.js';

import CodeMirror from 'codemirror/lib/codemirror.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/htmlembedded/htmlembedded.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/rubyblue.css';

import '@fortawesome/fontawesome-free-webfonts/css/fontawesome.css';
import '@fortawesome/fontawesome-free-webfonts/css/fa-brands.css';
import '@fortawesome/fontawesome-free-webfonts/css/fa-regular.css';
import '@fortawesome/fontawesome-free-webfonts/css/fa-solid.css';

window.CodeMirror = CodeMirror;

import angular from 'angular';

import 'angular-ui-codemirror/src/ui-codemirror.js';

import 'boxes-scroll/dist/boxesscroll.css';
import 'boxes-scroll/dist/boxesscroll.js';

import './index.css';

(function (ng, __) {
	'use strict';
	ng.module('app', ['boxes.scroll', 'ui.codemirror']).config(appConfig).controller('AppController', AppController);
	/* @ngInject */
	function appConfig($compileProvider) {
		// disable debug info
//		$compileProvider.debugInfoEnabled(false);
	}
	function AppController($http, $filter) {
		var ctrl = this;
		ctrl.module = 'boxes-scroll';
		ctrl.limit;
		ctrl.begin;
		ctrl.selectedItem;
		ctrl.keydown = keydown;

		init();
		ctrl.cmJsOptions = {
			lineWrapping: true,
			lineNumbers: true,
			theme: 'rubyblue',
			readOnly: 'nocursor',
			mode: 'javascript'
		};
		ctrl.cmHtmlOptions = {
			lineWrapping: true,
			lineNumbers: true,
			theme: 'rubyblue',
			readOnly: 'nocursor',
			mode: 'htmlembedded'
		};
		ctrl.response = null;
		ctrl.items = [];
		ctrl.items_200 = [];
		ctrl.height = 240;
		ctrl.nb = 200;

		function init() {
			$http.get('users.json').then(function (response) {
				ctrl.response = response.data;
				ctrl.items_200 = $filter('limitTo')(ctrl.response, 200, 0);
				ctrl.items = response.data;
			});
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
	}
})(angular, _);
