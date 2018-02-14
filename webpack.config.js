var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CleanObsoleteChunks = require('webpack-clean-obsolete-chunks');
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
				{
					test: /\.css$/,
					use: ExtractTextPlugin.extract({
						use: 'css-loader'
					})
				}, {
					test: /\.html$/,
					use: [
						'angular-templatecache-loader'
					]
				}, {
					test: /\.(woff|woff2|eot|ico|ttf|otf|png|svg|jpg|gif)$/,
					use: [
						'file-loader'
					]
				}, {
					test: /\.(csv|tsv)$/,
					use: 'csv-loader'
				}, {
					test: /\.xml$/,
					use: 'xml-loader'
				}
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
			//CommonChunksPlugin will now extract all the common modules from vendor and main bundles
			new webpack.optimize.CommonsChunkPlugin({
				name: 'manifest' //But since there are no more common modules between them we end up with just the runtime code included in the manifest file
			}),
			new HtmlWebpackPlugin({
				template: './index.ejs',
				favicon:'favicon.ico'
			}),
			new CleanObsoleteChunks({verbose: true})
		]
	};
};

