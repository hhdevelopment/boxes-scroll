var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CleanObsoleteChunks = require('webpack-clean-obsolete-chunks');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');
var path = require('path');

module.exports = function (env) {
	return {
		context: __dirname + '/src',
		entry: {
			main: './index.js'
		},
		output: {
			filename: '[name].[chunkhash].js',
			path: path.resolve(__dirname, 'public_html')
		},
		module: {
			rules: [
				{test: /\.css$/, use: ExtractTextPlugin.extract({use: 'css-loader'})},
				{test: /\.html$/, use: ['angular-templatecache-loader']}, 
				{test: /\.(json|woff|woff2|eot|ico|ttf|otf|png|svg|jpg|gif)$/, use: ['file-loader']},
				{test: /\.(csv|tsv)$/, use: 'csv-loader'},
				{test: /\.xml$/, use: 'xml-loader'}
			]
		},
		plugins: [
			new webpack.ProvidePlugin({
				_: 'lodash',
				'window.jQuery': 'jquery',
				'jQuery': 'jquery',
				'$': 'jquery'
			}),
			new ExtractTextPlugin('[name].[chunkhash].css'),
			new webpack.optimize.CommonsChunkPlugin({
				name: 'vendor',
				minChunks: function (module) {
					// this assumes your vendor imports exist in the node_modules directory
					return module.context && module.context.indexOf('node_modules') !== -1;
				}
			}),
			new HtmlWebpackPlugin({
				template: './index.ejs',
				favicon: 'favicon.ico'
			}),
			new CopyWebpackPlugin([
				{ from: 'users.json', to: '../public_html/' },  
				{ from: 'boxesscroll.css', to: '../dist/' },  
				{ from: 'boxesscroll.js', to: '../dist/' }
			]),
			new CleanObsoleteChunks({verbose: true})
		]
	};
};

