(function (ng) {
	'use strict';
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function hashKey(obj, nextUidFn) {
		var key = obj && obj.$$hashKey;

		if (key) {
			if (typeof key === 'function') {
				key = obj.$$hashKey();
			}
			return key;
		}

		var objType = typeof obj;
		if (objType === 'function' || (objType === 'object' && obj !== null)) {
			key = obj.$$hashKey = objType + ':' + (nextUidFn || nextUid)();
		} else {
			key = objType + ':' + obj;
		}

		return key;
	}
	function isArrayLike(obj) {

		// `null`, `undefined` and `window` are not array-like
		if (obj == null || isWindow(obj))
			return false;

		// arrays, strings and jQuery/jqLite objects are array like
		// * jqLite is either the jQuery or jqLite constructor function
		// * we have to check the existence of jqLite first as this method is called
		//   via the forEach method when constructing the jqLite object in the first place
		if (isArray(obj) || isString(obj) || (jqLite && obj instanceof jqLite))
			return true;

		// Support: iOS 8.2 (not reproducible in simulator)
		// "length" in obj used to prevent JIT error (gh-11508)
		var length = 'length' in Object(obj) && obj.length;

		// NodeList objects (with `item` method) and
		// other objects with suitable length characteristics are array-like
		return isNumber(length) && (length >= 0 && (length - 1) in obj || typeof obj.item === 'function');

	}
	function createMap() {
		return Object.create(null);
	}
	var scrollmodule;
	try {
		scrollmodule = ng.module('boxes.scroll');
	} catch (e) {
		scrollmodule = ng.module('boxes.scroll', []);
	}
	scrollmodule.directive('ngScroll', ['$parse', '$animate', '$compile', '$filter', ngScrollDirective]);
	function ngScrollDirective($parse, $animate, $compile, $filter) {
		var NG_REMOVED = '$$NG_REMOVED';
		var ngScrollMinErr = Error || minErr('ngScroll');

		var updateScope = function (scope, index, valueIdentifier, value, keyIdentifier, key, arrayLength) {
			// TODO(perf): generate setters to shave off ~40ms or 1-1.5%
			scope[valueIdentifier] = value;
			if (keyIdentifier)
				scope[keyIdentifier] = key;
			scope.$index = index;
			scope.$first = (index === 0);
			scope.$last = (index === (arrayLength - 1));
			scope.$middle = !(scope.$first || scope.$last);
			// eslint-disable-next-line no-bitwise
			scope.$odd = !(scope.$even = (index & 1) === 0);
		};

		var getBlockStart = function (block) {
			return block.clone[0];
		};

		var getBlockEnd = function (block) {
			return block.clone[block.clone.length - 1];
		};
		return {
			restrict: 'A',
			require: '^^boxVscroll',
			multiElement: true,
			transclude: 'element',
			priority: 1000,
			terminal: true,
			$$tlb: true,
			compile: ngScrollCompile
		};
		function ngScrollCompile($element, $attr) {
			var expression = $attr.ngScroll;
			var ngScrollEndComment = $compile.$$createComment('end ngScroll', expression);

			var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

			if (!match) {
				throw ngScrollMinErr('iexp', 'Expected expression in form of \'_item_ in _collection_[ track by _id_]\' but got \'{0}\'.',
						  expression);
			}

			var lhs = match[1];
			var rhs = match[2];
			var aliasAs = match[3];
			var trackByExp = match[4];

			match = lhs.match(/^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/);

			if (!match) {
				throw ngScrollMinErr('iidexp', '\'_item_\' in \'_item_ in _collection_\' should be an identifier or \'(_key_, _value_)\' expression, but got \'{0}\'.',
						  lhs);
			}
			var valueIdentifier = match[3] || match[1];
			var keyIdentifier = match[2];

			if (aliasAs && (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
					  /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(aliasAs))) {
				throw ngScrollMinErr('badident', 'alias \'{0}\' is invalid --- must be a valid JS identifier which is not a reserved name.',
						  aliasAs);
			}

			var trackByExpGetter, trackByIdExpFn, trackByIdArrayFn, trackByIdObjFn;
			var hashFnLocals = {$id: hashKey};

			if (trackByExp) {
				trackByExpGetter = $parse(trackByExp);
			} else {
				trackByIdArrayFn = function (key, value) {
					return hashKey(value);
				};
				trackByIdObjFn = function (key) {
					return key;
				};
			}

			return ngScrollLink;
			function ngScrollLink($scope, $element, $attr, boxController, $transclude) {
				console.log("ngScrollLink", arguments);
				boxController.setChildScope($scope);
				if (trackByExpGetter) {
					trackByIdExpFn = function (key, value, index) {
						// assign key, value, and $index to the locals so that they can be used in hash functions
						if (keyIdentifier)
							hashFnLocals[keyIdentifier] = key;
						hashFnLocals[valueIdentifier] = value;
						hashFnLocals.$index = index;
						return trackByExpGetter($scope, hashFnLocals);
					};
				}

				// Store a list of elements from previous run. This is a hash where key is the item from the
				// iterator, and the value is objects with following properties.
				//   - scope: bound scope
				//   - clone: previous element.
				//   - index: position
				//
				// We are using no-proto object so that we don't need to guard against inherited props via
				// hasOwnProperty.
				var lastBlockMap = createMap();

				//watch props
				$scope.$watchGroup(['limit', 'begin'], ngScrollUpdateValues);
				$scope.$watchCollection(rhs, ngScrollUpdateCollection);

				function ngScrollUpdateCollection(col) {
					console.log("UPDATE COL", rhs, col);
					boxController.setTotal(col.length);
				}
				function ngScrollUpdateValues(vs1, vs2, s) {
					console.log("UPDATE 'limit', 'begin'", vs1[0], vs1[1]);
					var collection = $filter('limitTo')(s[rhs], vs1[0], vs1[1]);
					var index, length,
							  previousNode = $element[0], // node that cloned nodes should be inserted after
							  // initialized to the comment node anchor
							  nextNode,
							  // Same as lastBlockMap but it has the current state. It will become the
							  // lastBlockMap on the next iteration.
							  nextBlockMap = createMap(),
							  collectionLength,
							  key, value, // key/value of iteration
							  trackById,
							  trackByIdFn,
							  collectionKeys,
							  block, // last object information {scope, element, id}
							  nextBlockOrder,
							  elementsToRemove;

					if (aliasAs) {
						$scope[aliasAs] = collection;
					}

					if (isArrayLike(collection)) {
						collectionKeys = collection;
						trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
					} else {
						trackByIdFn = trackByIdExpFn || trackByIdObjFn;
						// if object, extract keys, in enumeration order, unsorted
						collectionKeys = [];
						for (var itemKey in collection) {
							if (hasOwnProperty.call(collection, itemKey) && itemKey.charAt(0) !== '$') {
								collectionKeys.push(itemKey);
							}
						}
					}

					collectionLength = collectionKeys.length;
					nextBlockOrder = new Array(collectionLength);

					// locate existing items
					for (index = 0; index < collectionLength; index++) {
						key = (collection === collectionKeys) ? index : collectionKeys[index];
						value = collection[key];
						trackById = trackByIdFn(key, value, index);
						if (lastBlockMap[trackById]) {
							// found previously seen block
							block = lastBlockMap[trackById];
							delete lastBlockMap[trackById];
							nextBlockMap[trackById] = block;
							nextBlockOrder[index] = block;
						} else if (nextBlockMap[trackById]) {
							// if collision detected. restore lastBlockMap and throw an error
							forEach(nextBlockOrder, function (block) {
								if (block && block.scope)
									lastBlockMap[block.id] = block;
							});
							throw ngScrollMinErr('dupes',
									  'Duplicates in a repeater are not allowed. Use \'track by\' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}, Duplicate value: {2}',
									  expression, trackById, value);
						} else {
							// new never before seen block
							nextBlockOrder[index] = {id: trackById, scope: undefined, clone: undefined};
							nextBlockMap[trackById] = true;
						}
					}

					// remove leftover items
					for (var blockKey in lastBlockMap) {
						block = lastBlockMap[blockKey];
						elementsToRemove = getBlockNodes(block.clone);
						$animate.leave(elementsToRemove);
						if (elementsToRemove[0].parentNode) {
							// if the element was not removed yet because of pending animation, mark it as deleted
							// so that we can ignore it later
							for (index = 0, length = elementsToRemove.length; index < length; index++) {
								elementsToRemove[index][NG_REMOVED] = true;
							}
						}
						block.scope.$destroy();
					}

					// we are not using forEach for perf reasons (trying to avoid #call)
					for (index = 0; index < collectionLength; index++) {
						key = (collection === collectionKeys) ? index : collectionKeys[index];
						value = collection[key];
						block = nextBlockOrder[index];

						if (block.scope) {
							// if we have already seen this object, then we need to reuse the
							// associated scope/element

							nextNode = previousNode;

							// skip nodes that are already pending removal via leave animation
							do {
								nextNode = nextNode.nextSibling;
							} while (nextNode && nextNode[NG_REMOVED]);

							if (getBlockStart(block) !== nextNode) {
								// existing item which got moved
								$animate.move(getBlockNodes(block.clone), null, previousNode);
							}
							previousNode = getBlockEnd(block);
							updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
						} else {
							// new item which we don't know about
							$transclude(function (clone, scope) {
								block.scope = scope;
								// http://jsperf.com/clone-vs-createcomment
								var endNode = ngScrollEndComment.cloneNode(false);
								clone[clone.length++] = endNode;

								$animate.enter(clone, null, previousNode);
								previousNode = endNode;
								// Note: We only need the first/last node of the cloned nodes.
								// However, we need to keep the reference to the jqlite wrapper as it might be changed later
								// by a directive with templateUrl when its template arrives.
								block.clone = clone;
								nextBlockMap[block.id] = block;
								updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
							});
						}
					}
					lastBlockMap = nextBlockMap;
				}
			}
		}
	}
})(angular);