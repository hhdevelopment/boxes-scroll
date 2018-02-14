**boxes-scroll** 
[![Build Status](https://travis-ci.org/hhdevelopment/boxes-scroll.svg?branch=master)](https://travis-ci.org/hhdevelopment/boxes-scroll)

boxes-scroll is a collection of directives for angular 1.x

it allows to use angular directive *limitTo* synchronized with a scrollbar.

It is very usefull to use those directives when you want to show many items without impacting performance, burdened by the increase in watchers.

Those directeives limit the number of watchers and improve performance of your application.

More it is really usefull, if you want to scroll in a table but your users want to see the headers fixed.

Set size of your table in pixel on box, or set the maximun items that you want and box-scroll compute pertinent limit and manage begin variable.

![Screenshot1](screenshot1.png)

---

## Demo

http://hhdev.fr/boxes-scroll/index.html#

---

## Installation

Installation is easy with minimal dependencies - only the AngularJS and Jquery

#### Install with NPM

```sh
$ npm install scroll-box
```

### Adding dependency to your project

When you are done downloading all the dependencies and project files the only remaining part is to add dependencies on the `scroll-box` AngularJS module:

```js
require('./node_modules/ng-infinity-scroll/dist/scrollbox.css');
require('./node_modules/ng-infinity-scroll/dist/scrollbox.js');
```

```js
angular.module('myModule', ['scroll-box']);
```

## Uses

scroll-box are two directives

- vscroll-box : it is the most common use. it is a box with vertical scrollbar, synchronized with ng-repeat:   
  for example, on tr in the table with many rows.
- hscroll-box : A box with horizontal scrollbar, synchronized with ng-repeat.


### HTML

```html
<box-vscroll show-info-delay="2000" total="ctrl.items.length" 
					ng-begin="begin" ng-limit="limit"
					style="border:solid 1px black;height:300px">
	<table class="table table-hover table-striped">
		<thead>
			<tr>
				<th style="width:30px">First</th>
				<th style="width:20px">2e</th>
				<th>Third</th>
				<th>Fourth</th>
				<th style="width:50px">Last</th>
				<th style="width:20px"></th>
			</tr>
		</thead>
		<tbody>
			<tr ng-repeat="item in ctrl.items| limitTo:limit:begin">
				<td ng-bind="item"></td><td><span class="glyphicon glyphicon-user"></span></td><td>Mark</td><td>Otto</td><td>@mdo</td><td><span class="glyphicon glyphicon-adjust"></span></td>
			</tr>
		</tbody>
	</table>
</box-vscroll>
```

```js
(function (ng) {
	'use strict';
	ng.module('app', ['infinity.scroll']).controller('AppCtrl', AppCtrl);
	function AppCtrl() {
		var ctrl = this;
		ctrl.items = [.......];
	}
})(angular);
```

### Configuration

Important : For vertical infinity-scroll container, you have to set the height css property. Instead, you can set max-height.  
If you use max-height, you will see the item drawed one by one. Prefer height, mostly if many items will be visible. 

### Attributes configuration

1. total (number) : The number of items
3. ng-limit : the limit of window for directive limitTo. This value is managed by the directive, don't set it, just name it, in controller or scope
4. ng-begin : the begin of window  for directive limitTo. This value is managed by the directive, don't set it, just name it, in controller or scope
5. show-info-delay (number) (optional) : define the delay of time the infos about the window appears. Default value 1000 ms
6. debounce (number) (optional) : Set the delay before compute ng-limit. Default value 300 ms
7. collapsible (optional) : The scrollbar appears only when the mouse is over the container.

