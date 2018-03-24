module.exports = function (env) {
	return {
		context: __dirname + '/src',
		entry: {
			index: './index.js'
		},
		output: {
			filename: 'index.js',
 			path: __dirname + env.DEV?'/../websites/boxes-scroll/node_modules/boxes-scroll/dist':'/dist'
		},
		module: {
			rules: [
				{test: /boxesscroll\.(css|js)$/, use: [{loader: 'file-loader', options: {name: '[name].[ext]'}}]}
			]
		}
	};
};

