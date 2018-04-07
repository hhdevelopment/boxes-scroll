module.exports = function (env) {
	var dist = (env&&env.DEV?'/../websites/boxes-scroll/node_modules/boxes-scroll/dist':'/dist');
	console.log("Build to", dist);
	return {
		context: __dirname + '/src',
		entry: {
			index: './index.js'
		},
		output: {
			filename: 'index.js',
 			path: __dirname + dist
		},
		module: {
			rules: [
				{test: /boxesscroll\.(css|js)$/, use: [{loader: 'file-loader', options: {name: '[name].[ext]'}}]}
			]
		}
	};
};

